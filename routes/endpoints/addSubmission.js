const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const upload = require("../../storage/uploader");
const path = require("path");

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
        };

        for (var i = 0; i < file.copies; i++) {
            newSubmission.files.push(tempFile);
        }
    }

    await newSubmission.save();
    res.status(200).send("OK");
});

module.exports = router;
