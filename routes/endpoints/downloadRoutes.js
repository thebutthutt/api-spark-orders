const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");
const path = require("path");

router.get("/stl/:fileID", auth.optional, function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        res.sendFile(path.join(__dirname, "..", "..", "..", "Uploads", "STLs", thisFile.fileName));
    });
});

router.get("/gcode/:fileID", auth.optional, function (req, res) {
    console.log(req.params.fileID);
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        console.log(thisFile);
        if (thisFile.review.hasOwnProperty("gcodeName")) {
            res.sendFile(path.join(__dirname, "..", "..", "..", "Uploads", "Gcode", thisFile.review.gcodeName));
        } else {
            res.status(400).send("File not found");
        }
    });
});

module.exports = router;
