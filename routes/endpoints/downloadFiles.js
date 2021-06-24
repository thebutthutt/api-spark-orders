const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");
const path = require("path");
const fs = require("fs");
const gfs = require("../../storage/downloader");

router.get("/stl/:fileID", auth.optional, async function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        if (!thisFile.stlID) {
            let oldFileName = thisFile.originalFileName;
            let oldPath = path.join("/home/hcf0018/webserver/Uploads/STLs/", oldFileName);

            console.log(oldPath);
            var readStream = fs.createReadStream(oldPath);

            readStream.on("open", function () {
                // This just pipes the read stream to the response object (which goes to the client)
                readStream.pipe(res);
            });

            readStream.on("error", function (err) {
                return res.status(404).json({
                    err: "no files exist",
                });
            });
        } else {
            gfs.find({ _id: thisFile.stlID }).toArray((err, files) => {
                if (!files || files.length === 0) {
                    return res.status(404).json({
                        err: "no files exist",
                    });
                }
                gfs.openDownloadStream(thisFile.stlID).pipe(res);
            });
        }
    });
});

router.get("/gcode/:fileID", auth.optional, function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        if (!thisFile.gcodeID) {
            let oldFileName = thisFile.review.gcodeName;
            let oldPath = path.join("/home/hcf0018/webserver/Uploads/Gcode/", oldFileName);

            console.log(oldPath);
            var readStream = fs.createReadStream(oldPath);

            readStream.on("open", function () {
                // This just pipes the read stream to the response object (which goes to the client)
                readStream.pipe(res);
            });

            readStream.on("error", function (err) {
                return res.status(404).json({
                    err: "no files exist",
                });
            });
        } else {
            gfs.find({ _id: thisFile.gcodeID }).toArray((err, files) => {
                if (!files || files.length === 0) {
                    return res.status(404).json({
                        err: "no files exist",
                    });
                }
                gfs.openDownloadStream(thisFile.gcodeID).pipe(res);
            });
        }
    });
});

module.exports = router;
