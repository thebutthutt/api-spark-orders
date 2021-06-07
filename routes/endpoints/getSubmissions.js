const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

/* -------------------------------------------------------------------------- */
/*                          Submission Filters Return                         */
/* -------------------------------------------------------------------------- */
router.post("/filter", auth.required, async function (req, res) {
    /**
     * {
     * status: [
     *      UNREVIEWED,
     *      REVIEWED,
     *      PEDNDING_PAYMENT,
     *      READY_TO_PRINT,
     *      PRINTING,
     *      IN_TRANSIT,
     *      WAITING_FOR_PICKUP,
     *      PICKED_UP,
     *      REJECTED,
     *      STALE_ON_PAYMENT,
     *      STALE_ON_PICKUP,
     *      RESPOSESSED,
     *      LOST_IN_TRANSIT
     * ],
     * submittedBefore: date, defaults to tomorrow
     * submittedAfter: date, defaults to 1800
     * reviewedBefore ""
     * reviewedAfter ""
     * paidBefore ""
     * paidAfter ""
     * printedBefore ""
     * printedAfter ""
     * pickedupBefore ""
     * pickedupAfter ""
     * paymentType : ['PAID', 'WIAVED', 'UNPAID']
     * pickupLocation: ['Willis Library', 'Discovery Park']
     * showPersonal: Boolean
     * showClass: Boolean
     * showInternal: Boolean
     * showFullSubmission: Boolean
     * }
     */
    var requestedFilters = req.body;
    let submitted = {
        before: new Date(requestedFilters.submittedBefore != null ? requestedFilters.submittedBefore : "3031"),
        after: new Date(requestedFilters.submittedAfter != null ? requestedFilters.submittedAfter : "1900"),
    };
    submitted.before.setDate(submitted.before.getDate() + 1);

    let reviewed = {
        before: new Date(requestedFilters.reviewedBefore != null ? requestedFilters.reviewedBefore : "3031"),
        after: new Date(requestedFilters.reviewedAfter != null ? requestedFilters.reviewedAfter : "1900"),
    };
    reviewed.before.setDate(reviewed.before.getDate() + 1);

    let paid = {
        before: new Date(requestedFilters.paidBefore != null ? requestedFilters.paidBefore : "3031"),
        after: new Date(requestedFilters.paidAfter != null ? requestedFilters.paidAfter : "1900"),
    };
    paid.before.setDate(paid.before.getDate() + 1);

    let printed = {
        before: new Date(requestedFilters.printedBefore != null ? requestedFilters.printedBefore : "3031"),
        after: new Date(requestedFilters.printedAfter != null ? requestedFilters.printedAfter : "1900"),
    };
    printed.before.setDate(printed.before.getDate() + 1);

    let pickedUp = {
        before: new Date(requestedFilters.pickedupBefore != null ? requestedFilters.pickedupBefore : "3031"),
        after: new Date(requestedFilters.pickedupAfter != null ? requestedFilters.pickedupAfter : "1900"),
    };
    pickedUp.before.setDate(pickedUp.before.getDate() + 1);

    let results = await submissions.aggregate([
        {
            $match: {
                $and: [
                    { timestampSubmitted: { $lte: submitted.before, $gte: submitted.after } },
                    { timestampPaymentRequested: { $lte: reviewed.before, $gte: reviewed.after } },
                    { timestampPaid: { $lte: paid.before, $gte: paid.after } },
                    {
                        $or: [
                            { $expr: { $and: [{ isForClass: true }, requestedFilters.showClass] } },
                            { $expr: { $and: [{ isForDepartment: true }, requestedFilters.showInternal] } },
                            {
                                $expr: {
                                    $and: [
                                        { isForDepartment: false },
                                        { isForClass: false },
                                        requestedFilters.showPersonal,
                                    ],
                                },
                            },
                        ],
                    },
                ],
            },
        },
        {
            $set: {
                files: {
                    $filter: {
                        input: "$files",
                        as: "item",
                        cond: {
                            $and: [
                                { $in: ["$$item.status", requestedFilters.status] },
                                { $lte: ["$$item.printing.timestampPrinted", printed.before] },
                                { $gte: ["$$item.printing.timestampPrinted", printed.after] },
                                { $lte: ["$$item.pickup.timestampPickedUp", pickedUp.before] },
                                { $gte: ["$$item.pickup.timestampPickedUp", pickedUp.after] },
                                { $in: ["$$item.payment.paymentType", requestedFilters.paymentType] },
                            ],
                        },
                    },
                },
            },
        },
        {
            $addFields: {
                sums: {
                    $reduce: {
                        input: "$files",
                        initialValue: {
                            totalVolume: 0,
                            totalWeight: 0,
                            totalHours: 0,
                            totalMinutes: 0,
                        },
                        in: {
                            totalVolume: { $add: ["$$value.totalVolume", "$$this.review.calculatedVolumeCm"] },
                            totalWeight: { $add: ["$$value.totalWeight", "$$this.review.slicedGrams"] },
                            totalHours: { $add: ["$$value.totalHours", "$$this.review.slicedHours"] },
                            totalMinutes: { $add: ["$$value.totalMinutes", "$$this.review.slicedMinutes"] },
                        },
                    },
                },
            },
        },
        { $match: { "files.0": { $exists: true } } },
        { $sort: { timestampSubmitted: -1 } },
    ]);

    res.status(200).json({ submissions: results });
});

/* -------------------------------------------------------------------------- */
/*                 Get Submission With Separated Specific File                */
/* -------------------------------------------------------------------------- */
router.get("/onefile/:fileID", auth.required, function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);
        res.json({
            submission: submission,
            file: thisFile,
        });
    });
});

/* -------------------------------------------------------------------------- */
/*                             Get Full Submission                            */
/* -------------------------------------------------------------------------- */
router.get("/fullsubmission/:submissionID", auth.required, function (req, res) {
    submissions.findOne({ _id: req.params.submissionID }, function (err, submission) {
        res.json({
            submission: submission,
        });
    });
});

/* -------------------------------------------------------------------------- */
/*                    Simple Submission Details for Patron                    */
/* -------------------------------------------------------------------------- */
router.get("/status/:submissionID", async function (req, res) {});

module.exports = router;
