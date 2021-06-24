const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");
const payment = require("../../app/payment");

/* -------------------------------------------------------------------------- */
/*                      Redirect from successful payment                      */
/* -------------------------------------------------------------------------- */
router.post("/complete", async function (req, res) {
    let query = req.query;

    //validate payment
    let results = await payment.validatePaymentURL(query);
    let now = new Date();

    if (results.isValid) {
        let paidSubmission = await submissions.findById(results.submissionID);
        paidSubmission.payment.timestampPaid = now;

        //update file statuses
        for (var file of paidSubmission.files) {
            if (file.status == "PENDING_PAYMENT") {
                file.status = "READY_TO_PRINT";
                file.payment.timestampPaid = now;
                file.payment.paymentType = "PAID";
            }
        }

        paidSubmission.payment.libPaymentObject = results.libPaymentObject;

        //update submission status
        paidSubmission.currentQueue = "PRINT";

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
