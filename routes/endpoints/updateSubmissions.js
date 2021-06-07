const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const users = mongoose.model("User");
const auth = require("../auth");
const paymentHandler = require("../../app/payment");
const gfs = require("../../storage/downloader");
const uploader = require("../../storage/uploader");

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

/* -------------------------------------------------------------------------- */
/*                               Review One File                              */
/* -------------------------------------------------------------------------- */
router.post("/review/:fileID", uploader.any(), auth.required, async function (req, res) {
    var fileID = req.params.fileID;
    let jsonData = JSON.parse(req.body.jsonData);

    var result = await submissions.findOne({ "files._id": fileID });
    var selectedFile = result.files.id(fileID);

    let newNote = jsonData.newInternalNote;
    newNote.techName = req.user.name;
    newNote.techEUID = req.user.euid;

    result.allFilesReviewed = true;
    for (var file of result.files) {
        if (file.stlID.toString() == selectedFile.stlID.toString()) {
            file.status = "REVIEWED";
            file.gcodeID = jsonData.review.descision == "Accepted" ? req.files[0].id : null;
            file.review = Object.assign(file.review, jsonData.review);
            file.review.reviewedByName = req.user.name;
            file.review.reviewedByEUID = req.user.name;
            file.review.internalNotes.push(newNote);
            file.review.gcodeName = jsonData.review.descision == "Accepted" ? req.files[0].filename : "";
        } else {
            if (file.status == "UNREVIEWED") {
                result.allFilesReviewed = false;
            }
        }
    }

    await result.save();

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                              Add Internal Note                             */
/* -------------------------------------------------------------------------- */
router.post("/addnote/:fileID", auth.required, async function (req, res) {
    var fileID = req.params.fileID;

    var result = await submissions.findOne({ "files._id": fileID });
    var selectedFile = result.files.id(fileID);

    if (req.body.note.length > 0) {
        let newNote = {
            techName: req.user.name,
            techEUID: req.user.euid,
            notes: req.body.note,
            dateAdded: new Date(),
        };

        for (var file of result.files) {
            if (file.fileName == selectedFile.fileName) {
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
    var submission = await submissions.findOne({
        _id: req.params.submissionID,
    });

    let finalPaymentAmount = 0.0;
    let acceptedFiles = [];
    let rejectedFiles = [];

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
    submission.requestedPrice = finalPaymentAmount;
    submission.timestampPaymentRequested = now;
    submission.paymentRequestingName = req.user.name;
    submission.paymentRequestingEUID = req.user.euid;

    for (var file of submission.files) {
        if (file.review.descision == "Accepted") {
            file.status = "PENDING_PAYMENT";
            file.payment.timestampPaymentRequested = now;
        } else {
            file.status = "REJECTED";
        }
    }

    await submission.save();

    paymentHandler.completeReview(submission, finalPaymentAmount, acceptedFiles, rejectedFiles);

    res.status(200).send("OK");
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
        submission.timestampPaid = now;
        for (var file of submission.files) {
            if (file.status == "PENDING_PAYMENT") {
                file.status = "READY_TO_PRINT";
                file.payment.timestampPaid = now;
                file.payment.paymentType = "WAIVED";
                file.payment.waivedBy = thisUser.name;
            }
        }
    } else {
        //mark this submission as pending waive
        submission.isPendingWaive = true;
        for (var file of submission.files) {
            if (file.status == "PENDING_PAYMENT") {
                file.payment.isPendingWaive = true;
            }
        }
    }

    await submission.save();

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                             Undo Waive Request                             */
/* -------------------------------------------------------------------------- */

router.post("/undowaive/:submissionID", auth.required, async function (req, res) {
    var submission = await submissions.findOne({
        _id: req.params.submissionID,
    });

    submission.isPendingWaive = false;
    for (var file of submission.files) {
        if (file.status == "PENDING_PAYMENT") {
            file.payment.isPendingWaive = false;
        }
    }

    await submission.save();

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                               Delete One File                              */
/* -------------------------------------------------------------------------- */
router.post("/delete/file/:fileID", auth.required, async function (req, res) {
    console.log("here");
    var fileID = req.params.fileID;
    var result = await submissions.findOne({
        "files._id": fileID,
    });

    var thisFile = result.files.id(fileID);

    //delete stl from disk

    try {
        gfs.delete(thisFile.stlID);
    } catch (err) {
        console.log("STL file not found when deleting. This is fine though");
    }

    try {
        gfs.delete(thisFile.gcodeID);
    } catch (err) {
        console.log("GCODE file not found when deleting. This is fine though");
    }

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

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                           Delete Full Submission                           */
/* -------------------------------------------------------------------------- */
router.post("/delete/submission/:submissionID", auth.required, async function (req, res) {});

module.exports = router;
