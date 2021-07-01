const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const upload = require("../../storage/uploader");
const gfs = require("../../storage/downloader");
const NodeStl = require("node-stl");
const emailer = require("../../app/pugmail");
const logger = require("winston");
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
                logger.info(error);
                reject(error);
            }
        });
    });
}

router.post("/", upload.any(), async function (req, res) {
    var now = new Date();
    var jsonData = JSON.parse(req.body.jsonData);

    logger.info(req.files);

    let pickupLocation = jsonData.pickupLocation;

    var newSubmission = new submissions({
        patron: {
            fname: jsonData.fname,
            lname: jsonData.lname,
            email: jsonData.email,
            phone: jsonData.phone,
            euid: jsonData.euid,
        },
        submissionDetails: {
            submissionType: jsonData.submissionType,
            classDetails: {
                classCode: jsonData.classCode,
                professor: jsonData.professor,
                project: jsonData.assignment,
            },
            internalDetails: {
                department: jsonData.department,
                project: jsonData.project,
            },

            timestampSubmitted: now,
            numFiles: 0,
        },

        files: [],
    });

    for (var file of jsonData.files) {
        var uploadedFile = req.files.find((x) => {
            return x.fieldname == "stl-" + file.copyGroupID;
        });

        var uploadedThumbnail = req.files.find((x) => {
            return x.fieldname == "thumb-" + file.copyGroupID;
        });

        logger.info(uploadedThumbnail);

        let volume = await calculateVolume(uploadedFile.id);
        var tempFile = {
            fileName: uploadedFile.filename,
            copyGroupID: file.copyGroupID,
            stlID: uploadedFile.id,
            thumbID: uploadedThumbnail.id,
            status: "UNREVIEWED",
            request: {
                timestampSubmitted: now,
                material: file.material,
                color: file.color,
                infill: file.infill,
                notes: file.notes,
                pickupLocation: pickupLocation,
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
    emailer.sendEmail("submissionRecieved", newSubmission);
    res.status(200).send("OK");
});

module.exports = router;
