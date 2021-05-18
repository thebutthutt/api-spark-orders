const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const submissions = mongoose.model("Submission");
const auth = require("../auth");
var gcodePath = path.join(__dirname, "..", "..", "Uploads", "Gcode");
var stlPath = path.join(__dirname, "..", "..", "Uploads", "STLs");

/**
 *  req:
 *  status: "UNREVIEWED",
            "REVIEWED",
            "PENDING_PAYMENT",
            "READY_TO_PRINT",
            "PRINTING",
            "IN_TRANSIT",
            "WAITING_FOR_PICKUP",
            "PICKED_UP",
            "REJECTED",
            "STALE_ON_PAYMENT",
            "STALE_ON_PICKUP",
            "REPOSESSED",
            "LOST_IN_TRANSIT",
    pickupLocation:
            "Willis Library",
            "Discovery Park",
            "Both"
    printingLocation:
            "Willis Library",
            "Discovery Park",
            "Both"
 */
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

router.post("/delete/file/:fileID", auth.required, async function (req, res) {
    console.log("here");
    var fileID = req.params.fileID;
    var result = await submissions.findOne({
        "files._id": fileID,
    });

    var thisFile = result.files.id(fileID);

    //delete stl from disk

    try {
        var thisSTLPath = path.join(stlPath, thisFile.fileName);
        fs.unlinkSync(thisSTLPath);
    } catch (error) {
        console.error("there was STL error:", thisFile.fileName, error.message);
    }

    //delete gcode from disk if it exists

    if (thisFile.review.gcodeName) {
        try {
            var thisGcodePath = path.join(gcodePath, thisFile.gcodeName);
            fs.unlinkSync(thisGcodePath);
        } catch (error) {
            console.error("there was GCODE error:", thisFile.gcodeName, error.message);
        }
    }

    thisFile.remove(); //remove the single file from the top level print submission
    result.numFiles -= 1; //decrement number of files associated with this print request

    if (result.numFiles < 1) {
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
router.post("/delete/submission/:submissionID", auth.required, async function (req, res) {});

module.exports = router;
