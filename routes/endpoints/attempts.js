const logger = require("../../app/logger");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const attempts = mongoose.model("Attempt");
const printers = mongoose.model("Printer");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

// attempts.find({}, function (err, all) {
//     all.forEach(function (attempt) {
//         printers.findOne({ _id: attempt.printerID }, function (err, res) {
//             logger.info(attempt);
//             let now = attempt.timestampStarted;
//             let diffMinutes = Math.round((now - (now.getFullYear(), 0, 1)) / 60000); //how many minutes since the year began
//             logger.info(attempt.printerName, attempt.printerID, res._id);
//             let prettyID = res.shortName.replace(/\s+/g, "") + "-" + diffMinutes.toString(36).toUpperCase();
//             attempt.prettyID = prettyID;
//             attempt.save();
//         });
//     });
// });

/* -------------------------------------------------------------------------- */
/*                         Add a new printing attempt                         */
/* -------------------------------------------------------------------------- */
router.post("/new", auth.required, async function (req, res) {
    let now = new Date();
    let printer = await printers.findById(req.body.printerID);
    let fileIDs = req.body.fileIDs;

    /* ---------------------------- Create pretty ID ---------------------------- */
    let diffMinutes = Math.round((now - (now.getFullYear(), 0, 1)) / 60000); //how many minutes since the year began
    let prettyID = printer.shortName.replace(/\s+/g, "") + "-" + diffMinutes.toString(36).toUpperCase();

    /* --------------------------- create new attempt --------------------------- */
    let newAttempt = new attempts({
        prettyID: prettyID,
        timestampStarted: now,
        location: printer.location,
        printerName: printer.name,
        printerID: printer._id,
        rollID: req.body.rollID,
        startWeight: req.body.initialWeight,
        startedByName: req.user.name,
        startedByEUID: req.user.euid,
        fileIDs: fileIDs,
        fileNames: req.body.fileNames,
    });

    await newAttempt.save();

    /* ----------------------------- update printer ----------------------------- */
    printer.status = "PRINTING";
    printer.attemptIDs.push(newAttempt._id);
    await printer.save();

    /* ------------------------- Update files in attempt ------------------------ */
    for (var fileID of fileIDs) {
        let submission = await submissions.findOne({ "files._id": fileID });
        let selectedFile = submission.files.id(fileID);
        selectedFile.status = "PRINTING";
        selectedFile.printing.printingLocation = printer.location;
        selectedFile.printing.attemptIDs.push(newAttempt._id);
        selectedFile.printing.attemptNames.push(newAttempt.prettyID);
        await submission.save();
    }

    /* ----------------------------- save and return ---------------------------- */
    res.status(200).send("OK");
});

router.get("/:attemptID", auth.required, async function (req, res) {
    let attempt = await attempts.findById(req.params.attemptID);
    res.status(200).json(attempt);
});

/* -------------------------------------------------------------------------- */
/*                          Complete Printing Atempt                          */
/* -------------------------------------------------------------------------- */
router.post("/complete/:attemptID", auth.required, async function (req, res) {
    let now = new Date();

    logger.info(req.params.attemptID);
    logger.info(req.body);

    let endWeight = req.body.finalWeight;
    let wasSuccess = req.body.wasSuccess;

    let attempt = await attempts.findById(req.params.attemptID);
    logger.info(attempt);

    /* --------------------------- Update attempt info -------------------------- */
    attempt.timestampEnded = now;
    attempt.isFinished = true;
    attempt.isSuccess = wasSuccess;
    attempt.isFailure = !wasSuccess;
    attempt.endWeight = endWeight;
    attempt.finishedByName = req.user.name;
    attempt.finishedByEUID = req.user.euid;

    let printer = await printers.findById(attempt.printerID);
    printer.status = "IDLE";
    await printer.save();

    //deep copy
    let remainingFileIDs = JSON.parse(JSON.stringify(attempt.fileIDs));

    do {
        let currentFileID = remainingFileIDs[0];
        let submission = await submissions.findOne({ "files._id": currentFileID });
        let selectedFile = submission.files.id(currentFileID);

        submission.flags.allFilesPrinted = true;
        let submissionReadyForPickup = true,
            allFilesPrinted = true;

        /* ------------------------- All files in submission ------------------------ */
        for (let file of submission.files) {
            let index = remainingFileIDs.indexOf(file._id.toString());

            /**
             * for each file in this submission, check if the file
             * exists in this attempt to save time
             */
            if (index != -1) {
                /**
                 * File exists in this attempt
                 */
                remainingFileIDs.splice(index, 1); //remove from remaining files in attempt
                if (wasSuccess) {
                    //successful attempt
                    file.printing.timestampPrinted = now;
                    file.printing.printingLocation = attempt.location;

                    if (attempt.location == file.request.pickupLocation) {
                        //file ready for pickup
                        file.status = "WAITING_FOR_PICKUP";
                        file.pickup.timestampArrivedAtPickup = now;
                    } else {
                        //file needs to be transferred
                        file.status = "IN_TRANSIT";
                        submissionReadyForPickup = false; //not all ready
                    }
                } else {
                    //failed attempt
                    file.printing.failedAttempts += 1;
                    file.status = "READY_TO_PRINT";
                    allFilesPrinted = false;
                }
            } else if (file.copyGroupID === selectedFile.copyGroupID && !wasSuccess) {
                /**
                 * File is not in the attmpt, but it is a copy of
                 * another file in this attempt AND it failed
                 */
                file.printing.failedAttempts += 1;
            } else {
                /**
                 * File is not in the attempt and did not have another
                 * copy printed in this attempt
                 */

                //unprinted file
                if (file.status == "READY_TO_PRINT") {
                    allFilesPrinted = false;
                    submissionReadyForPickup = false;
                }

                //file printed but in transit
                if (file.status == "IN_TRANSIT") {
                    submissionReadyForPickup = false;
                }
            }
        }
        /* --------------- After all files in submission have updated --------------- */

        submission.flags.allFilesPrinted = allFilesPrinted;

        if (submissionReadyForPickup) {
            submission.pickup.timestampPickupRequested = now;

            let firstWarning = new Date();
            firstWarning.setDate(now.getDate() + 7);
            let finalWarning = new Date();
            finalWarning.setDate(now.getDate() + 14);
            let resposession = new Date();
            resposession.setDate(now.getDate() + 21);

            submission.pickup.timestampFirstWarning = firstWarning;
            submission.pickup.timestampFinalWarning = finalWarning;
            submission.pickup.timestampReposessed = resposession;
            //TODO: send pickup email if all on location
        }

        await submission.save();
    } while (remainingFileIDs.length > 0);

    /* ----------------------------- Save and return ---------------------------- */
    await attempt.save();
    res.status(200).send("OK");
});

router.post("/delete/:attemptID", auth.required, async function (req, res) {
    let attemptID = req.params.attemptID;

    let thisAttempt = await attempts.findById(attemptID);

    try {
        for await (let fileID of thisAttempt.fileIDs) {
            let thisSubmission = await submissions.findOne({ "files._id": fileID });
            let thisFile = thisSubmission.files.id(fileID);

            if (thisAttempt.timestampEnded < new Date("1980")) {
                thisFile.status == "READY_TO_PRINT";
            }

            thisFile.printing.attemptIDs = thisFile.printing.attemptIDs.filter(function (e) {
                return e !== attemptID;
            });

            thisFile.printing.attemptNames = thisFile.printing.attemptNames.filter(function (e) {
                return e !== thisAttempt.prettyID;
            });

            await thisSubmission.save();
        }
    } catch (e) {
        logger.info(e);
    }

    let attemptPrinter = await printers.findById(thisAttempt.printerID);
    attemptPrinter.attemptIDs = attemptPrinter.attemptIDs.filter(function (e) {
        return e !== attemptID;
    });

    if (thisAttempt.timestampEnded < new Date("1980")) {
        attemptPrinter.status == "IDLE";
    }

    await attemptPrinter.save();

    await attempts.deleteOne({ _id: attemptID });

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                               Filter attempts                              */
/* -------------------------------------------------------------------------- */
router.post("/filter", auth.required, async function (req, res) {
    let filters = req.body;

    let started = {
        before: new Date(filters.started.before != null ? filters.started.before : "3031"),
        after: new Date(filters.started.after != null ? filters.started.after : "1900"),
    };
    started.before.setDate(started.before.getDate() + 1);

    let ended = {
        before: new Date(filters.ended.before != null ? filters.ended.before : "3031"),
        after: new Date(filters.ended.after != null ? filters.ended.after : "1900"),
    };
    ended.before.setDate(ended.before.getDate() + 1);

    let results = await attempts.aggregate([
        {
            $match: {
                $and: [
                    { timestampStarted: { $lte: started.before, $gte: started.after } },
                    { timestampEnded: { $lte: ended.before, $gte: ended.after } },
                ],
            },
        },
        {
            $lookup: {
                from: "submissions",
                localField: "fileIDs",
                foreignField: "files._id",
                as: "submissions",
            },
        },
        {
            $set: {
                submissions: {
                    $map: {
                        input: {
                            $map: {
                                input: "$submissions",
                                as: "submission",
                                in: {
                                    $mergeObjects: [
                                        "$$submission",
                                        {
                                            files: {
                                                $filter: {
                                                    input: "$$submission.files",
                                                    as: "file",
                                                    cond: {
                                                        $in: ["$$file._id", "$fileIDs"],
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                        as: "filteredSubmission",
                        in: {
                            $mergeObjects: [
                                "$$filteredSubmission",
                                {
                                    totalPrice: {
                                        $round: [
                                            {
                                                $sum: [
                                                    {
                                                        $multiply: [
                                                            {
                                                                $sum: ["$$filteredSubmission.files.review.slicedHours"],
                                                            },
                                                            1,
                                                        ],
                                                    },
                                                    {
                                                        $divide: [
                                                            {
                                                                $sum: [
                                                                    "$$filteredSubmission.files.review.slicedMinutes",
                                                                ],
                                                            },
                                                            60,
                                                        ],
                                                    },
                                                ],
                                            },
                                            2,
                                        ],
                                    },
                                    anyWaived: {
                                        $in: ["WAIVED", "$$filteredSubmission.files.payment.paymentType"],
                                    },
                                },
                            ],
                        },
                    },
                },
            },
        },
        {
            $set: {
                totalPrice: {
                    $round: [
                        {
                            $sum: ["$submissions.totalPrice"],
                        },
                        2,
                    ],
                },
                weightChange: {
                    $cond: [
                        "$isFinished",
                        {
                            $subtract: ["$startWeight", "$endWeight"],
                        },
                        0,
                    ],
                },
                timeChangeMillis: {
                    $cond: [
                        "$isFinished",
                        {
                            $subtract: ["$timestampEnded", "$timestampStarted"],
                        },
                        0,
                    ],
                },
                countsAsWaived: {
                    $anyElementTrue: ["$submissions.anyWaived"],
                },
            },
        },
        {
            $facet: {
                attempts: [
                    {
                        $sort: {
                            timestampStarted: -1,
                        },
                    },
                ],
                totals: [
                    {
                        $group: {
                            _id: "$countsAsWaived",
                            wasWaived: { $first: "$countsAsWaived" },
                            count: { $sum: 1 },
                            price: {
                                $sum: "$totalPrice",
                            },
                            filament: {
                                $sum: "$weightChange",
                            },
                            timeMillis: {
                                $sum: "$timeChangeMillis",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    let output = results[0];
    let paidTotals = output.totals[0].wasWaived ? output.totals[1] : output.totals[0];
    let waivedTotals = output.totals[0].wasWaived ? output.totals[0] : output.totals[1];

    if (!paidTotals) {
        paidTotals = {
            _id: false,
            wasWaived: false,
            count: 0,
            price: 0,
            filament: 0,
            timeMillis: 0,
        };
    }

    if (!waivedTotals) {
        waivedTotals = {
            _id: true,
            wasWaived: true,
            count: 0,
            price: 0,
            filament: 0,
            timeMillis: 0,
        };
    }

    res.status(200).json({
        attempts: output.attempts,
        paidTotals: paidTotals,
        waivedTotals: waivedTotals,
    });
});

module.exports = router;
