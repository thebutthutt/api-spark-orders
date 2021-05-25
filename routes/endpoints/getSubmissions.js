const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

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

    requestedFilters.submittedBefore =
        requestedFilters.submittedBefore != null ? requestedFilters.submittedBefore : "3031";
    requestedFilters.submittedAfter =
        requestedFilters.submittedAfter != null ? requestedFilters.submittedAfter : "1900";

    requestedFilters.reviewedBefore =
        requestedFilters.reviewedBefore != null ? requestedFilters.reviewedBefore : "3031";
    requestedFilters.reviewedAfter = requestedFilters.reviewedAfter != null ? requestedFilters.reviewedAfter : "1900";

    requestedFilters.paidBefore = requestedFilters.paidBefore != null ? requestedFilters.paidBefore : "3031";
    requestedFilters.paidAfter = requestedFilters.paidAfter != null ? requestedFilters.paidAfter : "1900";

    requestedFilters.printedBefore = requestedFilters.printedBefore != null ? requestedFilters.printedBefore : "3031";
    requestedFilters.printedAfter = requestedFilters.printedAfter != null ? requestedFilters.printedAfter : "1900";

    requestedFilters.pickedupBefore =
        requestedFilters.pickedupBefore != null ? requestedFilters.pickedupBefore : "3031";
    requestedFilters.pickedupAfter = requestedFilters.pickedupAfter != null ? requestedFilters.pickedupAfter : "1900";

    let allSubmissions = await submissions.find({});
    let filteredSubmissions = [];
    for await (var submission of allSubmissions) {
        //submission level filters
        let submittedMatch =
            submission.timestampSubmitted < new Date(requestedFilters.submittedBefore) &&
            submission.timestampSubmitted > new Date(requestedFilters.submittedAfter);
        let reviewMatch =
            submission.timestampPaymentRequested < new Date(requestedFilters.reviewedBefore) &&
            submission.timestampPaymentRequested > new Date(requestedFilters.reviewedAfter);
        let paidMatch =
            submission.timestampPaid < new Date(requestedFilters.paidBefore) &&
            submission.timestampPaid > new Date(requestedFilters.paidAfter);

        let personalMatch = requestedFilters.showPersonal
            ? !submission.isForClass && !submission.isForDepartment
            : submission.isForClass || submission.isForDepartment;
        let classMatch = requestedFilters.showClass ? submission.isForClass : !submission.isForClass;
        let internalMatch = requestedFilters.showInternal ? submission.isForDepartment : !submission.isForDepartment;

        let earlyCheck = submittedMatch && reviewMatch && paidMatch && (personalMatch || classMatch || internalMatch);

        if (earlyCheck) {
            //Find all files in this submission matching requested filters
            let matchingFiles = await submission.files.filter((file) => {
                let statusMatch = requestedFilters.status.includes(file.status);
                let printedMatch =
                    file.printing.timestampPrinted < new Date(requestedFilters.printedBefore) &&
                    file.printing.timestampPrinted > new Date(requestedFilters.printedAfter);
                let pickupMatch =
                    file.pickup.timestampPickedUp < new Date(requestedFilters.pickedupBefore) &&
                    file.pickup.timestampPickedUp > new Date(requestedFilters.pickedupAfter);
                let paymentMatch = requestedFilters.paymentType.includes(file.payment.paymentType);
                let pickupLocationMatch = requestedFilters.pickupLocation.includes(file.request.pickupLocation);

                return statusMatch && printedMatch && pickupMatch && paymentMatch && pickupLocationMatch;
            });

            if (matchingFiles.length > 0) {
                let tempSubmission = submission.toObject();

                if (!requestedFilters.showFullSubmission) {
                    delete tempSubmission.files;
                    tempSubmission.files = matchingFiles;
                }

                filteredSubmissions.push(tempSubmission);
            }
        }
    }

    res.status(200).json({ submissions: filteredSubmissions });
});

/* -------------------------------------------------------------------------- */
/*                        Get All Matching Submissions                        */
/* -------------------------------------------------------------------------- */
router.post("/", auth.required, async function (req, res) {
    var antiPrint = "Both";
    var antiPickup = "Both";
    var statuses = [];

    if (req.body.status == "UNREVIEWED" || req.body.status == "REVIEWED") {
        statuses = ["UNREVIEWED", "REVIEWED"];
    } else {
        statuses.push(req.body.status);
    }

    if (req.body.printingLocation == "Willis Library") {
        antiPrint = "Discovery Park";
    } else if (req.body.printingLocation == "Discovery Park") {
        antiPrint = "Willis Library";
    }

    if (req.body.pickupLocation == "Willis Library") {
        antiPickup = "Discovery Park";
    } else if (req.body.pickupLocation == "Discovery Park") {
        antiPickup = "Willis Library";
    }

    var results = await submissions.aggregate([
        {
            $set: {
                files: {
                    $filter: {
                        input: "$files",
                        as: "item",
                        cond: {
                            $and: [
                                { $in: ["$$item.status", statuses] },
                                { $ne: ["$$item.printing.printingLocation", antiPrint] },
                                { $ne: ["$$item.request.pickupLocation", antiPickup] },
                            ],
                        },
                    },
                },
            },
        },
        { $match: { "files.0": { $exists: true } } },
    ]);
    res.json({ submissions: results });
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

module.exports = router;
