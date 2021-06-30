const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const attempts = mongoose.model("Attempt");
const printers = mongoose.model("Printer");
const auth = require("../auth");
const path = require("path");
const fs = require("fs");
const JSZip = require("jszip");
const gfs = require("../../storage/downloader");
const excel = require("exceljs");

router.get("/stl/:fileID", auth.optional, async function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        if (!thisFile.stlID) {
            let oldFileName = thisFile.originalFileName;
            let oldPath = path.join("/home/hcf0018/webserver/Uploads/STLs/", oldFileName);
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

router.get("/zip/:submissionID", auth.required, async function (req, res) {
    let submissionID = req.params.submissionID;
    let submission = await submissions.findById(submissionID);

    let promises = [];
    var zip = new JSZip();

    for await (let file of submission.files) {
        promises.push(
            new Promise((resolve, reject) => {
                gfs.find({ _id: file.stlID }).toArray((err, files) => {
                    if (files && files.length > 0) {
                        let chunks = [];
                        let fileBuffer;
                        let stream = gfs.openDownloadStream(file.stlID);

                        stream.on("data", (chunk) => {
                            chunks.push(chunk);
                        });
                        stream.once("end", () => {
                            fileBuffer = Buffer.concat(chunks);
                            zip.file(file.fileName, fileBuffer);
                            console.log("finished");
                            resolve();
                        });
                    } else {
                        let chunks = [];
                        let fileBuffer;
                        let oldFileName = file.originalFileName;
                        let oldPath = path.join("/home/hcf0018/webserver/Uploads/STLs/", oldFileName);
                        var readStream = fs.createReadStream(oldPath);

                        readStream.on("data", function (chunk) {
                            chunks.push(chunk);
                        });

                        readStream.on("error", function (err) {
                            resolve();
                        });

                        readStream.once("end", () => {
                            fileBuffer = Buffer.concat(chunks);
                            zip.file(file.fileName, fileBuffer);
                            console.log("finished");
                            resolve();
                        });
                    }
                });
            })
        );
        promises.push(
            new Promise((resolve, reject) => {
                gfs.find({ _id: file.gcodeID }).toArray((err, files) => {
                    if (files && files.length > 0) {
                        let chunks = [];
                        let fileBuffer;
                        let stream = gfs.openDownloadStream(file.gcodeID);

                        stream.on("data", (chunk) => {
                            chunks.push(chunk);
                        });
                        stream.once("end", () => {
                            fileBuffer = Buffer.concat(chunks);
                            zip.file(file.gcodeName, fileBuffer);
                            console.log("finished");
                            resolve();
                        });
                    } else {
                        let chunks = [];
                        let fileBuffer;
                        let oldFileName = file.review.gcodeName;
                        let oldPath = path.join("/home/hcf0018/webserver/Uploads/Gcode/", oldFileName);
                        var readStream = fs.createReadStream(oldPath);

                        readStream.on("data", function (chunk) {
                            chunks.push(chunk);
                        });

                        readStream.on("error", function (err) {
                            resolve();
                        });

                        readStream.once("end", () => {
                            fileBuffer = Buffer.concat(chunks);
                            zip.file(file.review.gcodeName, fileBuffer);
                            console.log("finished");
                            resolve();
                        });
                    }
                });
            })
        );
    }

    Promise.all(promises).then(() => {
        zip.generateNodeStream({ type: "nodebuffer", streamFiles: true })
            .pipe(res)
            .on("finish", function () {
                // JSZip generates a readable stream with a "end" event,
                // but is piped here in a writable stream which emits a "finish" event.
                console.log("out.zip written.");
            });
    });
});

router.get("/export/:dbname", auth.admin, async function (req, res) {
    let dbName = req.params.dbname;

    switch (dbName) {
        case "submissions":
            submissions.find({}).toArray(function (error, result) {
                let workbook = new excel.Workbook(); //creating workbook
                let worksheet = workbook.addWorksheet("Submissions"); //creating worksheet

                worksheet.columns = [
                    { header: "Patron Name", key: "name" },
                    { header: "Email", key: "email" },
                    { header: "Phone", key: "phone" },
                    { header: "Euid", key: "euid" },
                    { header: "Submission Type", key: "type" },
                    { header: "Class Code", key: "age" },
                    { header: "Professor", key: "age" },
                    { header: "Assignment", key: "age" },
                    { header: "Department", key: "age" },
                    { header: "Project", key: "age" },
                ];
            });
            break;

        default:
            break;
    }
});

module.exports = router;
