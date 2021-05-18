const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

router.get("/:fileID", auth.required, function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        res.json({
            submission: submission,
            file: thisFile,
        });
    });
});

module.exports = router;
