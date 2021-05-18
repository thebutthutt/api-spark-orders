const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
var multer = require("multer");
const submissions = mongoose.model("Submission");
const path = require("path");

router.post(
    "/",
    multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, path.join(__dirname, "..", "..", "..", "Uploads", "STLs"));
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
    async function (req, res) {
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
                originalFileName: uploadedFile.filename.split("-")[1].split(".")[0].replace(/\W/g, "") + ".stl",
                fileName: uploadedFile.filename,
                status: "UNREVIEWED",
                request: {
                    timestampSubmitted: now,
                    material: file.material,
                    color: file.color,
                    infill: file.infill,
                    notes: file.notes,
                },
            };
            newSubmission.files.push(tempFile);
        }

        console.log("saving");
        await newSubmission.save();
        console.log("saved");
        res.status(200).send("OK");
    }
);

module.exports = router;
