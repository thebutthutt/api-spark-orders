const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const attempts = mongoose.model("Attempt");
const printers = mongoose.model("Printer");
const auth = require("../auth");
const logger = require("../../app/logger");
const gfs = require("../../storage/downloader");
const uploader = require("../../storage/uploader");

// let allPrinters = printers.find({}, function (err, res) {
//     for (var printer of res) {
//         printer.shortName = printer.name;
//         printer.save();
//     }
// });

/* -------------------------------------------------------------------------- */
/*             Get all printers with their currently printing data            */
/* -------------------------------------------------------------------------- */
router.get("/list", auth.required, async function (req, res) {
    let allPrinters = await printers.aggregate([
        {
            $addFields: {
                currentAttempt: {
                    $arrayElemAt: ["$attemptIDs", -1],
                },
            },
        },
        {
            $lookup: {
                from: "attempts",
                localField: "currentAttempt",
                foreignField: "_id",
                as: "currentAttempt",
            },
        },
        {
            $set: {
                currentAttempt: {
                    $arrayElemAt: ["$currentAttempt", 0],
                },
            },
        },
    ]);
    res.status(200).json({ printers: allPrinters });
});

/* -------------------------------------------------------------------------- */
/*                          Get a printer's thumbnail                         */
/* -------------------------------------------------------------------------- */
router.get("/thumbnail/:printerID", auth.required, async function (req, res) {
    let printer = await printers.findOne({ _id: req.params.printerID });
    gfs.find({ _id: printer.imageID }).toArray((err, files) => {
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: "no files exist",
            });
        }
        gfs.openDownloadStream(printer.imageID).pipe(res);
    });
});

/* -------------------------------------------------------------------------- */
/*                              Add a new printer                             */
/* -------------------------------------------------------------------------- */
router.post("/new", uploader.any(), auth.required, async function (req, res) {
    let printerData = JSON.parse(req.body.jsonData);
    var newPrinter = new printers(printerData);

    if (req.files && req.files.length > 0) {
        let imageFile = req.files[0];
        newPrinter.imageID = imageFile.id;
    }

    await newPrinter.save();

    res.status(200).send("OK");
});

/* -------------------------------------------------------------------------- */
/*                         Update an existing printer                         */
/* -------------------------------------------------------------------------- */
router.post("/update/:printerID", uploader.any(), auth.required, async function (req, res) {
    let printer = await printers.findById(req.params.printerID);
    let printerData = JSON.parse(req.body.jsonData);

    printer = Object.assign(printer, printerData);

    if (req.files && req.files.length > 0) {
        let imageFile = req.files[0];

        if (printer.imageID) {
            logger.info("deleting");
            gfs.delete(printer.imageID, (err) => {
                logger.info("err delete printer image");
            });
        }

        printer.imageID = imageFile.id;
    }

    await printer.save();

    res.status(200).send("OK");
});

router.post("/delete/:printerID", auth.admin, async function (req, res) {
    let printer = await printers.findById(req.params.printerID);
    if (printer.imageID) {
        logger.info("deleting");
        gfs.delete(printer.imageID, (err) => {
            logger.info("err delete printer image");
        });
    }
    await printers.deleteOne({ _id: req.params.printerID });
    res.status(200).send("OK");
});

module.exports = router;
