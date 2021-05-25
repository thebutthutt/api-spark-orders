const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const attempts = mongoose.model("Attempt");
const printers = mongoose.model("Printer");
const auth = require("../auth");

router.get("/", auth.required, async function (req, res) {
    var allPrinters = await printers.find({});
    res.status(200).json({ printers: allPrinters });
});

router.post("/new", auth.required, async function (req, res) {
    var newPrinter = new printers(req.body);
    await newPrinter.save();

    res.status(200).send("OK");
});

router.post("/update/:printerID", auth.required, async function (req, res) {
    let printer = await printers.findById(req.params.printerID);
    printer = Object.assign(printer, req.body);
    await printer.save();

    res.status(200).send("OK");
});

module.exports = router;
