const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

/* -------------------------------------------------------------------------- */
/*                        Get All Matching Submissions                        */
/* -------------------------------------------------------------------------- */
router.post("/", auth.required, async function (req, res) {
    var antiPrint = "Both";
    var antiPickup = "Both";
    var statuses = [];

    if (req.body.status == "UNREVIEWED" || req.body.status == "REVIEWED") {
        statuses = ["UNREVIEWED", "REVIEWED"];
    } else {
        statuses.push(req.body.status);
    }

    if (req.body.printingLocation == "Willis Library") {
        antiPrint = "Discovery Park";
    } else if (req.body.printingLocation == "Discovery Park") {
        antiPrint = "Willis Library";
    }

    if (req.body.pickupLocation == "Willis Library") {
        antiPickup = "Discovery Park";
    } else if (req.body.pickupLocation == "Discovery Park") {
        antiPickup = "Willis Library";
    }

    var results = await submissions.aggregate([
        {
            $set: {
                files: {
                    $filter: {
                        input: "$files",
                        as: "item",
                        cond: {
                            $and: [
                                { $in: ["$$item.status", statuses] },
                                { $ne: ["$$item.printing.printingLocation", antiPrint] },
                                { $ne: ["$$item.request.pickupLocation", antiPickup] },
                            ],
                        },
                    },
                },
            },
        },
        { $match: { "files.0": { $exists: true } } },
    ]);
    res.json({ submissions: results });
});

/* -------------------------------------------------------------------------- */
/*                 Get Submission With Separated Specific File                */
/* -------------------------------------------------------------------------- */
router.get("/onefile/:fileID", auth.required, function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        res.json({
            submission: submission,
            file: thisFile,
        });
    });
});

/* -------------------------------------------------------------------------- */
/*                             Get Full Submission                            */
/* -------------------------------------------------------------------------- */
router.get("/fullsubmission/:submissionID", auth.required, function (req, res) {
    submissions.findOne({ _id: req.params.submissionID }, function (err, submission) {
        res.json({
            submission: submission,
        });
    });
});

module.exports = router;
