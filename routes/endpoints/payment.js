const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");
const payment = require("../../app/payment");

router.post("/complete", async function (req, res) {
    let query = req.query;
    let results = await payment.validatePaymentURL(query);
    let now = new Date();

    if (results.isValid) {
        let paidSubmission = await submissions.findById(results.submissionID);
        paidSubmission.timestampPaid = now;

        for (var file of paidSubmission.files) {
            if (file.status == "PENDING_PAYMENT") {
                file.status = "READY_TO_PRINT";
                file.payment.timestampPaid = now;
                file.payment.paymentType = "PAID";
            }
        }

        paidSubmission.libPaymentObject = results.libPaymentObject;
        await paidSubmission.save();

        res.status(200).json({
            isValid: true,
            paidSubmission: paidSubmission,
            amountPaid: results.amountPaid,
            datePaid: results.datePaid,
        });
    } else {
        res.status(200).json({ isValid: false });
    }
});

module.exports = router;
