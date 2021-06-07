const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const attempts = mongoose.model("Attempt");
const printers = mongoose.model("Printer");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

// attempts.find({}, function (err, all) {
//     all.forEach(function (attempt) {
//         printers.findOne({ _id: attempt.printerID }, function (err, res) {
//             console.log(attempt);
//             let now = attempt.timestampStarted;
//             let diffMinutes = Math.round((now - (now.getFullYear(), 0, 1)) / 60000); //how many minutes since the year began
//             console.log(attempt.printerName, attempt.printerID, res._id);
//             let prettyID = res.shortName.replace(/\s+/g, "") + "-" + diffMinutes.toString(36).toUpperCase();
//             attempt.prettyID = prettyID;
//             attempt.save();
//         });
//     });
// });

router.post("/new", auth.required, async function (req, res) {
    let now = new Date();
    let printer = await printers.findById(req.body.printerID);
    let fileIDs = req.body.fileIDs;

    let diffMinutes = Math.round((now - (now.getFullYear(), 0, 1)) / 60000); //how many minutes since the year began
    let prettyID = printer.name.replace(/\s+/g, "") + "-" + diffMinutes.toString(36).toUpperCase();

    let newAttempt = new attempts({
        prettyID: prettyID,
        timestampStarted: now,
        location: printer.location,
        printerName: printer.name,
        printerID: printer._id,
        rollID: req.body.rollID,
        startWeight: req.body.initialWeight,
        startedByName: req.user.name,
        startedByEUID: req.user.euid,
        fileIDs: fileIDs,
        fileNames: req.body.fileNames,
    });

    await newAttempt.save();

    printer.status = "PRINTING";
    printer.attemptIDs.push(newAttempt._id);
    await printer.save();

    for (var fileID of fileIDs) {
        let submission = await submissions.findOne({ "files._id": fileID });
        let selectedFile = submission.files.id(fileID);
        selectedFile.status = "PRINTING";
        selectedFile.printing.printingLocation = printer.location;
        selectedFile.printing.attemptIDs.push(newAttempt._id);
        await submission.save();
    }

    res.status(200).send("OK");
});

router.get("/:attemptID", auth.required, async function (req, res) {
    let attempt = await attempts.findById(req.params.attemptID);
    res.status(200).json(attempt);
});

router.post("/update/:attemptID", auth.required, async function (req, res) {});
router.post("/complete/:attemptID", auth.required, async function (req, res) {
    let attempt = await attempts.findById(req.params.attemptID);
});

module.exports = router;
