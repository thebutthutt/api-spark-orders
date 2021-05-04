const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

router.get("/:fileID", auth.required, function (req, res) {
    console.log(req.params);
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        console.log("one file");
        res.json({
            submission: submission,
            file: thisFile,
        });
    });
});

module.exports = router;
