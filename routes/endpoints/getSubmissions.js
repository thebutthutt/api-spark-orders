const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const attempts = mongoose.model("Attempt");
const gfs = require("../../storage/downloader");
const auth = require("../auth");
const numPerPage = 10;

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
    let pageNum = req.body.currentPage || 1;

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

    let submissionTypes = [];
    if (requestedFilters.showClass) {
        submissionTypes.push("CLASS");
    }

    if (requestedFilters.showInternal) {
        submissionTypes.push("INTERNAL");
    }

    if (requestedFilters.showPersonal) {
        submissionTypes.push("PERSONAL");
    }

    let requirePrinted = requestedFilters.printedLocation.length != 2;
    let requireWaitingForPickup = requestedFilters.waitingLocation.length != 2;

    let minAttempts = requestedFilters.waitingLocation.length != 2 ? 1 : 0;
    let searchQuery = requestedFilters.searchQuery.trim();

    let results = await submissions.aggregate([
        /* --------------------- Match submission level filters --------------------- */
        {
            $match: {
                $and: [
                    { "submissionDetails.timestampSubmitted": { $lte: submitted.before, $gte: submitted.after } },
                    { "paymentRequest.timestampPaymentRequested": { $lte: reviewed.before, $gte: reviewed.after } },
                    { "payment.timestampPaid": { $lte: paid.before, $gte: paid.after } },
                    { "submissionDetails.submissionType": { $in: submissionTypes } },
                    {
                        $or: [
                            {
                                $and: [{ "flags.isArchived": { $eq: true } }, { $expr: requestedFilters.showArchived }],
                            },
                            {
                                $and: [
                                    { "flags.isArchived": { $ne: true } },
                                    { $expr: requestedFilters.showUnarchived },
                                ],
                            },
                        ],
                    },
                    {
                        $or: [
                            {
                                $and: [
                                    { $expr: { $gte: [{ $strLenCP: searchQuery }, 1] } },
                                    {
                                        $or: [
                                            { "patron.fname": { $regex: searchQuery, $options: "gmi" } },
                                            { "patron.lname": { $regex: searchQuery, $options: "gmi" } },
                                            { "patron.email": { $regex: searchQuery, $options: "gmi" } },
                                            { "patron.phone": { $regex: searchQuery, $options: "gmi" } },
                                            { "patron.euid": { $regex: searchQuery, $options: "gmi" } },
                                            { "files.fileName": { $regex: searchQuery, $options: "gmi" } },
                                        ],
                                    },
                                ],
                            },
                            { $expr: { $lt: [{ $strLenCP: searchQuery }, 1] } },
                        ],
                    },
                ],
            },
        },

        /* ------------------------ Match file level filters ------------------------ */
        { $unwind: "$files" },
        {
            $match: {
                $and: [
                    { "files.status": { $in: requestedFilters.status } },
                    { "files.printing.timestampPrinted": { $lte: printed.before } },
                    { "files.printing.timestampPrinted": { $gte: printed.after } },
                    {
                        $or: [
                            {
                                $and: [
                                    { $expr: requirePrinted },
                                    { $expr: { $gte: [{ $size: "$files.printing.attemptIDs" }, minAttempts] } },
                                    { "files.printing.printingLocation": { $in: requestedFilters.printedLocation } },
                                ],
                            },
                            { $expr: { $ne: [requirePrinted, true] } },
                        ],
                    },
                    {
                        $or: [
                            {
                                $and: [
                                    { $expr: requireWaitingForPickup },
                                    { "files.status": { $in: ["WAITING_FOR_PICKUP", "PICKED_UP", "REPOSESSED"] } },
                                    { "files.request.pickupLocation": { $in: requestedFilters.waitingLocation } },
                                ],
                            },
                            { $expr: { $ne: [requireWaitingForPickup, true] } },
                        ],
                    },
                    { "files.pickup.timestampPickedUp": { $lte: pickedUp.before } },
                    { "files.pickup.timestampPickedUp": { $gte: pickedUp.after } },
                    { "files.payment.paymentType": { $in: requestedFilters.paymentType } },
                    { "files.request.pickupLocation": { $in: requestedFilters.pickupLocation } },
                ],
            },
        },

        /* -------------------------- Grab attempt details -------------------------- */
        {
            $lookup: {
                from: "attempts",
                localField: "files.printing.attemptIDs",
                foreignField: "_id",
                as: "files.printing.attemptDetails",
            },
        },

        /* ------------------------ Rebuild Files subdocument ----------------------- */
        {
            $group: {
                _id: "$_id",
                object: { $mergeObjects: "$$ROOT" },
                files: { $addToSet: "$files" },
            },
        },
        { $addFields: { "object.files": "$files" } },
        { $replaceRoot: { newRoot: "$object" } },

        /* --------------------- Sort by most recently submitted -------------------- */
        { $sort: { "submissionDetails.timestampSubmitted": -1 } },

        /* ------------------ Split into pagination and total count ----------------- */
        {
            $facet: {
                pageSubmissions: [
                    /* -------------------------------- Paginate -------------------------------- */
                    { $skip: (pageNum - 1) * numPerPage },
                    { $limit: numPerPage },

                    /* -------------------------- Submission level sums ------------------------- */
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
                                        totalVolume: {
                                            $add: ["$$value.totalVolume", "$$this.review.calculatedVolumeCm"],
                                        },
                                        totalWeight: { $add: ["$$value.totalWeight", "$$this.review.slicedGrams"] },
                                        totalHours: { $add: ["$$value.totalHours", "$$this.review.slicedHours"] },
                                        totalMinutes: { $add: ["$$value.totalMinutes", "$$this.review.slicedMinutes"] },
                                    },
                                },
                            },
                        },
                    },
                ],
                totalCount: [{ $count: "totalCount" }],
            },
        },
        {
            $set: {
                totalCount: {
                    $reduce: {
                        input: "$totalCount",
                        initialValue: 0,
                        in: { $add: ["$$value", "$$this.totalCount"] },
                    },
                },
            },
        },
    ]);

    let pageSubmissions = results[0].pageSubmissions;
    let totalCount = results[0].totalCount;

    res.status(200).json({ submissions: pageSubmissions, totalCount: totalCount });
});

router.get("/thumbnail/:fileID", auth.optional, function (req, res) {
    submissions.findOne({ "files._id": req.params.fileID }, function (err, submission) {
        var thisFile = submission.files.id(req.params.fileID);

        gfs.find({ _id: thisFile.thumbID }).toArray((err, files) => {
            if (!files || files.length === 0) {
                return res.status(404).json({
                    err: "no files exist",
                });
            }
            gfs.openDownloadStream(thisFile.thumbID).pipe(res);
        });
    });
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
