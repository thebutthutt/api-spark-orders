const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const emails = mongoose.model("Email");
const auth = require("../auth");

router.get("/get/:email", auth.required, async function (req, res) {
    let emailType = req.params.email;

    let email = await emails.findOne({ templateName: emailType });
    res.status(200).json({ email: email });
});

router.post("/update/:email", auth.admin, async function (req, res) {
    let emailType = req.params.email;

    let email = await emails.findOne({ templateName: emailType });
    email.subject = req.body.subject;
    email.bodyText = req.body.bodyText;
    await email.save();
    res.status(200).json({ email: email });
});

module.exports = router;
