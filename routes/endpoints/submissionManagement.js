const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const submissions = mongoose.model("Submission");
const auth = require("../auth");
const multer = require("multer");
const paymentHandler = require("../../app/payment");
const gcodePath = path.join(__dirname, "..", "..", "..", "Uploads", "Gcode");
const stlPath = path.join(__dirname, "..", "..", "..", "Uploads", "STLs");

/* -------------------------------------------------------------------------- */
/*                               Review One File                              */
/* -------------------------------------------------------------------------- */
router.post(
    "/review/:fileID",
    multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, gcodePath);
            },

            // By default, multer removes file extensions so let's add them back
            filename: function (req, file, cb) {
                cb(
                    null,
                    new Date().getTime().toString(36) +
                        Math.floor(Math.random() * 10) +
                        "-" +
                        file.originalname.split(".")[0].replace(/\W/g, "") +
                        path.extname(file.originalname)
                );
            },
        }),
    }).any(),
    auth.required,
    async function (req, res) {
        var fileID = req.params.fileID;
        let jsonData = JSON.parse(req.body.jsonData);

        var result = await submissions.findOne({ "files._id": fileID });
        var file = result.files.id(fileID);

        let newNote = jsonData.newInternalNote;
        newNote.techName = req.user.name;

        file.review = Object.assign(file.review, jsonData.review);
        file.review.reviewedBy = req.user.name;
        file.review.internalNotes.push(newNote);
        file.review.gcodeName = req.files[0].filename;
        file.review.originalGcodeName = req.files[0].originalname;

        await result.save();

        res.status(200).send("OK");
    }
);

/* -------------------------------------------------------------------------- */
/*                         Complete Submission Review                         */
/* -------------------------------------------------------------------------- */
router.post("/requestpayment/:submissionID", auth.required, async function (req, res) {
    var result = await submissions.findOne({
        _id: req.params.submissionID,
    });
    paymentHandler.completeReview(result);
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

/* -------------------------------------------------------------------------- */
/*                           Delete Full Submission                           */
/* -------------------------------------------------------------------------- */
router.post("/delete/submission/:submissionID", auth.required, async function (req, res) {});

module.exports = router;
