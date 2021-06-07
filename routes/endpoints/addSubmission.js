const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const upload = require("../../storage/uploader");
const gfs = require("../../storage/downloader");
const NodeStl = require("node-stl");
const path = require("path");

async function calculateVolume(fileID) {
    return new Promise((resolve, reject) => {
        let chunks = [],
            buffer;
        let calcVolume = 0;

        let downloadStream = gfs.openDownloadStream(fileID);

        downloadStream.on("data", function (chunk) {
            chunks.push(chunk);
        });

        downloadStream.on("end", function () {
            buffer = Buffer.concat(chunks);
            try {
                var stl = new NodeStl(buffer, {
                    density: 1.04,
                });
                calcVolume = stl.volume.toFixed(2);
                resolve(calcVolume);
            } catch (error) {
                console.log(error);
                reject(error);
            }
        });
    });
}

router.post("/", upload.any(), async function (req, res) {
    var now = new Date();
    var jsonData = JSON.parse(req.body.jsonData);

    var newSubmission = new submissions({
        patron: {
            fname: jsonData.fname,
            lname: jsonData.lname,
            email: jsonData.email,
            phone: jsonData.phone,
            euid: jsonData.euid,
        },
        isForClass: jsonData.submissionType == "class" ? true : false,
        isForDepartment: jsonData.submissionType == "internal" ? true : false,
        classCode: jsonData.classCode,
        professor: jsonData.professor,
        projectType: jsonData.assignment,
        department: jsonData.department,
        departmentProject: jsonData.project,
        timestampSubmitted: now,
        numFiles: 0,
        files: [],
    });

    for (var file of jsonData.files) {
        var uploadedFile = req.files.find((x) => {
            return x.originalname == file.fileName;
        });

        let volume = await calculateVolume(uploadedFile.id);
        var tempFile = {
            fileName: uploadedFile.filename,
            stlID: uploadedFile.id,
            status: "UNREVIEWED",
            request: {
                timestampSubmitted: now,
                material: file.material,
                color: file.color,
                infill: file.infill,
                notes: file.notes,
            },
            review: {
                calculatedVolumeCm: volume,
            },
        };

        for (var i = 0; i < file.copies; i++) {
            newSubmission.files.push(tempFile);
        }
    }

    await newSubmission.save();
    res.status(200).send("OK");
});

module.exports = router;
