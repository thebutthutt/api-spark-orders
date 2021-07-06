const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const users = mongoose.model("User");
const auth = require("../auth");
const emailer = require("../../app/pugmail");
const paymentHandler = require("../../app/payment");
const gfs = require("../../storage/downloader");
const uploader = require("../../storage/uploader");
const logger = require("../../app/logger");

// let allSubmissions = submissions.find({}, function (err, res) {
//     for (var submission of res) {
//         let finalPaymentAmount = 0.0;
//         let acceptedFiles = [];
//         let rejectedFiles = [];

//         for (var file of submission.files) {
//             if (file.review.descision == "Accepted") {
//                 let thisPrice = Math.max(file.review.slicedHours + file.review.slicedMinutes / 60, 1);
//                 finalPaymentAmount += thisPrice;
//                 acceptedFiles.push({
//                     filename: file.fileName,
//                     notes: file.review.patronNotes,
//                     price: thisPrice.toFixed(2),
//                 });
//             } else {
//                 rejectedFiles.push({
//                     filename: file.fileName,
//                     notes: file.review.patronNotes,
//                 });
//             }

//             if (file.review.internalNotes.length > 0) {
//                 file.review.reviewedByName = file.review.internalNotes[0].techName;
//                 file.review.reviewedByEUID = file.review.internalNotes[0].techEUID;
//             }
//         }
//         finalPaymentAmount = finalPaymentAmount.toFixed(2);
//         submission.requestedPrice = finalPaymentAmount;

//         submission.save();
//     }
// });

// let allSubmissions = submissions.find({}, function (err, res) {
//     for (let submission of res) {
//         for (let file of submission.files) {
//             let backupName = file.fileName;
//             file.fileName = file.originalFileName;
//             file.originalFileName = backupName;

//             logger.info(file.fileName);
//         }
//         submission.save();
//     }
// });

// let allSubmissions = submissions.find({}, function (err, res) {
//     for (let submission of res) {
//         for (let file of submission.files) {
//             if (file.status == "STALE_ON_PICKUP") {
//                 file.status = "REPOSESSED";
//             }
//         }
//         submission.save();
//     }
// });

/* -------------------------------------------------------------------------- */
/*                               Review One File                              */
/* -------------------------------------------------------------------------- */
router.post("/review/:fileID", uploader.any(), auth.required, async function (req, res) {
    var fileID = req.params.fileID;
    let jsonData = JSON.parse(req.body.jsonData);

    //get submission and file
    var result = await submissions.findOne({ "files._id": fileID });
    var selectedFile = result.files.id(fileID);

    //remove old gcode if exist
    gfs.delete(selectedFile.gcodeID, (err) => {
        if (err) {
            logger.info("Error deleting gcode, but this is fine");
        }
    });

    //create new note
    let newNote = jsonData.newInternalNote;
    newNote.techName = req.user.name;
    newNote.techEUID = req.user.euid;

    //add review to file
    for (let file of result.files) {
        if (file.copyGroupID == selectedFile.copyGroupID) {
            file.status = "REVIEWED";
            file.gcodeID = jsonData.review.descision == "Accepted" ? req.files[0].id : null;
            file.review = Object.assign(file.review, jsonData.review);
            file.review.reviewedByName = req.user.name;
            file.review.reviewedByEUID = req.user.euid;

            if (newNote.notes.length > 0) {
                file.review.internalNotes.push(newNote);
            }

            file.review.gcodeName = jsonData.review.descision == "Accepted" ? req.files[0].filename : "";
        }
    }

    result.flags.allFilesReviewed = result.files.reduce((allReviewed, file) => {
        if (file.copyGroupID == selectedFile.copyGroupID) {
            return allReviewed && true;
        } else {
            logger.info(allReviewed && file.status == "REVIEWED");
            return allReviewed && file.status == "REVIEWED";
        }
    }, true);

    await result.save();

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                              Add Internal Note                             */
/* -------------------------------------------------------------------------- */
router.post("/addnote/:fileID", auth.required, async function (req, res) {
    var fileID = req.params.fileID;

    //get submission and file
    var result = await submissions.findOne({ "files._id": fileID });
    var selectedFile = result.files.id(fileID);

    //add note if it has content
    if (req.body.note.length > 0) {
        let newNote = {
            techName: req.user.name,
            techEUID: req.user.euid,
            notes: req.body.note,
            dateAdded: new Date(),
        };

        for (var file of result.files) {
            if (file.copyGroupID == selectedFile.copyGroupID) {
                file.review.internalNotes.push(newNote);
            }
        }
    }
    await result.save();
    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                         Complete Submission Review                         */
/* -------------------------------------------------------------------------- */
router.post("/requestpayment/:submissionID", auth.required, async function (req, res) {
    var now = new Date();

    //get submission
    var submission = await submissions.findOne({
        _id: req.params.submissionID,
    });

    let finalPaymentAmount = 0.0;
    let acceptedFiles = [];
    let rejectedFiles = [];

    //calculate file and submission price(s)
    for (var file of submission.files) {
        if (file.review.descision == "Accepted") {
            let thisPrice = Math.max(file.review.slicedHours + file.review.slicedMinutes / 60, 1);
            finalPaymentAmount += thisPrice;
            acceptedFiles.push({
                filename: file.fileName,
                notes: file.review.patronNotes,
                price: thisPrice.toFixed(2),
            });
        } else {
            rejectedFiles.push({
                filename: file.fileName,
                notes: file.review.patronNotes,
            });
        }
    }
    finalPaymentAmount = finalPaymentAmount.toFixed(2);

    //add payment request data to submission
    submission.paymentRequest.requestedPrice = finalPaymentAmount;
    submission.paymentRequest.timestampPaymentRequested = now;
    submission.paymentRequest.paymentRequestingName = req.user.name;
    submission.paymentRequest.paymentRequestingEUID = req.user.euid;

    //update file statusees
    for (var file of submission.files) {
        if (file.review.descision == "Accepted") {
            file.status = "PENDING_PAYMENT";
            file.payment.timestampPaymentRequested = now;
        } else {
            file.status = "REJECTED";
        }
    }

    //update submission status
    submission.currentQueue = "PAYMENT";

    await submission.save();

    paymentHandler.completeReview(
        submission,
        finalPaymentAmount,
        acceptedFiles,
        rejectedFiles,
        async function (paymentURL) {
            submission.payment.paymentURL = paymentURL;
            await submission.save();
            res.status(200).send("OK");
        }
    );
});

/* -------------------------------------------------------------------------- */
/*                              Waive Submission                              */
/* -------------------------------------------------------------------------- */

router.post("/waive/:submissionID", auth.required, async function (req, res) {
    var now = new Date();
    var submission = await submissions.findOne({
        _id: req.params.submissionID,
    });

    var thisUser = await users.findById(req.user.id);

    if (thisUser.isSuperAdmin) {
        //fully waive this submission
        submission.payment.timestampPaid = now;
        for (var file of submission.files) {
            if (file.status == "PENDING_PAYMENT") {
                file.status = "READY_TO_PRINT";
                file.payment.timestampPaid = now;
                file.payment.paymentType = "WAIVED";
                file.payment.waivedBy = thisUser.name;
            }
        }

        submission.currentQueue = "PRINT";
        await submission.save();
        emailer.sendEmail("paymentWaived", submission);
    } else {
        //mark this submission as pending waive
        submission.flags.isPendingWaive = true;
        for (var file of submission.files) {
            if (file.status == "PENDING_PAYMENT") {
                file.payment.isPendingWaive = true;
            }
        }
        await submission.save();
    }

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                             Undo Waive Request                             */
/* -------------------------------------------------------------------------- */

router.post("/undowaive/:submissionID", auth.required, async function (req, res) {
    var submission = await submissions.findOne({
        _id: req.params.submissionID,
    });

    submission.flags.isPendingWaive = false;
    for (var file of submission.files) {
        if (file.status == "PENDING_PAYMENT") {
            file.payment.isPendingWaive = false;
        }
    }

    await submission.save();

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                             Mark files arrived                             */
/* -------------------------------------------------------------------------- */
router.post("/arrived", auth.required, async function (req, res) {
    let fileIDs = req.body.fileIDs;
    let now = new Date();
    let submission = await submissions.findOne({ "files._id": fileIDs[0] });

    for (let file of submission.files) {
        if (fileIDs.includes(file._id)) {
            file.status = "WAITING_FOR_PICKUP";
            file.pickup.timestampArrivedAtPickup = now;
        }
    }

    let allFilesArrived = submission.files.reduce((allArrived, file) => {
        return allArrived && (file.status == "WAITING_FOR_PICKUP" || file.status == "REJECTED");
    }, true);

    if (allFilesArrived) {
        submission.currentQueue = "PICKUP";
        submission.pickup.timestampPickupRequested = now;

        let firstWarning = new Date();
        firstWarning.setDate(now.getDate() + 7);
        let finalWarning = new Date();
        finalWarning.setDate(now.getDate() + 14);
        let resposession = new Date();
        resposession.setDate(now.getDate() + 21);

        submission.timestampFirstWarning = firstWarning;
        submission.timestampFinalWarning = finalWarning;
        submission.timestampReposessed = resposession;

        emailer.sendEmail("readyForPickup", submission);
    }

    await submission.save();

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                               Delete One File                              */
/* -------------------------------------------------------------------------- */
router.post("/delete/file/:fileID", auth.required, async function (req, res) {
    if (req.user) var fileID = req.params.fileID;
    var result = await submissions.findOne({
        "files._id": fileID,
    });

    var thisUser = await users.findById(req.user.id);

    if (thisUser.isSuperAdmin) {
        var thisFile = result.files.id(fileID);

        //delete stl from disk

        gfs.delete(thisFile.stlID, (err) => {
            if (err) {
                logger.info("Error deleting stl, but this is fine");
            }
        });

        gfs.delete(thisFile.gcodeID, (err) => {
            if (err) {
                logger.info("Error deleting gcode, but this is fine");
            }
        });

        thisFile.remove(); //remove the single file from the top level print submission
        result.numFiles -= 1; //decrement number of files associated with this print request

        if (result.files.length < 1) {
            //if no more files in this request delete the request itself
            await submissions.deleteOne({
                _id: result._id,
            });
        } else {
            //else save the top level with one less file
            result.allFilesReviewed = true;
            for (var thisFile of result.files) {
                if (!thisFile.isReviewed) {
                    result.allFilesReviewed = false;
                }
            }

            await result.save();
        }
    } else {
    }

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                           Delete Full Submission                           */
/* -------------------------------------------------------------------------- */
router.post("/delete/submission/:submissionID", auth.required, async function (req, res) {});

module.exports = router;
