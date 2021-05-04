const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const auth = require("../auth");

router.get("/", auth.required, function (req, res) {
    submissions.find({}, function (err, results) {
        res.json({ submissions: results });
    });
});

router.get("/new", auth.required, function (req, res) {
    //load the submission page and flash any messages
    console.log("getting");
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $eq: ["$$item.status", "UNREVIEWED"],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            console.log("files", data);
            res.json({ submissions: data });
        }
    );
});
router.get("/pendpay", auth.required, function (req, res) {
    //load the submission page and flash any messages
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $and: [
                                    {
                                        $eq: ["$$item.isPendingPayment", true],
                                    },
                                    {
                                        $ne: ["$$item.isStaleOnPayment", true],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

//show pending payment prints
router.get("/pendpaystale", auth.required, function (req, res) {
    //load the submission page and flash any messages
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $eq: ["$$item.isStaleOnPayment", true],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

//-------------READY TO PRINT------------------------

//show pready to print all locations
router.get("/ready", auth.required, function (req, res) {
    //load the submission page and flash any messages
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $and: [
                                    {
                                        $eq: ["$$item.isReadyToPrint", true],
                                    },
                                    {
                                        $eq: ["$$item.isPrinted", false],
                                    },
                                    {
                                        $lt: [
                                            {
                                                $add: [
                                                    {
                                                        $toInt: "$$item.printingData.copiesPrinting",
                                                    },
                                                    {
                                                        $toInt: "$$item.printingData.copiesPrinted",
                                                    },
                                                ],
                                            },
                                            { $toInt: "$$item.copies" },
                                        ],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

//show ready to print at willis
router.get("/readywillis", auth.required, function (req, res) {
    //load the submission page and flash any messages
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $and: [
                                    {
                                        $eq: ["$$item.isReadyToPrint", true],
                                    },
                                    {
                                        $eq: ["$$item.isPrinted", false],
                                    },
                                    {
                                        $lt: [
                                            {
                                                $add: [
                                                    {
                                                        $toInt: "$$item.printingData.copiesPrinting",
                                                    },
                                                    {
                                                        $toInt: "$$item.printingData.copiesPrinted",
                                                    },
                                                ],
                                            },
                                            { $toInt: "$$item.copies" },
                                        ],
                                    },
                                    {
                                        $eq: ["$$item.printLocation", "Willis Library"],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

//show ready to print at dp
router.get("/readydp", auth.required, function (req, res) {
    //load the submission page and flash any messages
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $and: [
                                    {
                                        $eq: ["$$item.isReadyToPrint", true],
                                    },
                                    {
                                        $eq: ["$$item.isPrinted", false],
                                    },
                                    {
                                        $lt: [
                                            {
                                                $add: [
                                                    {
                                                        $toInt: "$$item.printingData.copiesPrinting",
                                                    },
                                                    {
                                                        $toInt: "$$item.printingData.copiesPrinted",
                                                    },
                                                ],
                                            },
                                            { $toInt: "$$item.copies" },
                                        ],
                                    },
                                    {
                                        $eq: ["$$item.printLocation", "Discovery Park"],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/printing", auth.required, function (req, res) {
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: { $eq: ["$$item.isStarted", true] },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/printingwillis", auth.required, function (req, res) {
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $and: [
                                    {
                                        $eq: ["$$item.isStarted", true],
                                    },
                                    {
                                        $eq: ["$$item.printingData.location", "Willis Library"],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/printingdp", auth.required, function (req, res) {
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $and: [
                                    {
                                        $eq: ["$$item.isStarted", true],
                                    },
                                    {
                                        $eq: ["$$item.printingData.location", "Discovery Park"],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/intransit", auth.required, function (req, res) {
    submissions.aggregate(
        [
            { $unwind: "$files" },
            {
                $set: {
                    "files.completedCopies": {
                        $filter: {
                            input: "$files.completedCopies",
                            as: "item",
                            cond: { $eq: ["$$item.isInTransit", true] },
                        },
                    },
                },
            },
            { $match: { "files.completedCopies.0": { $exists: true } } },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    files: { $addToSet: "$files" },
                },
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$doc", { files: "$files" }],
                    },
                },
            },
            { $sort: { timestampSubmitted: -1 } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/pickup", auth.required, function (req, res) {
    submissions.aggregate(
        [
            { $unwind: "$files" },
            {
                $set: {
                    "files.completedCopies": {
                        $filter: {
                            input: "$files.completedCopies",
                            as: "item",
                            cond: {
                                $and: [
                                    { $eq: ["$$item.isInTransit", false] },
                                    {
                                        $lt: ["$$item.timestampPickedUp", new Date("1980")],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.completedCopies.0": { $exists: true } } },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    files: { $addToSet: "$files" },
                },
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$doc", { files: "$files" }],
                    },
                },
            },
            { $sort: { timestampSubmitted: -1 } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/pickupwillis", auth.required, function (req, res) {
    submissions.aggregate(
        [
            { $unwind: "$files" },
            {
                $set: {
                    "files.completedCopies": {
                        $filter: {
                            input: "$files.completedCopies",
                            as: "item",
                            cond: {
                                $and: [
                                    { $eq: ["$$item.isInTransit", false] },
                                    {
                                        $lt: ["$$item.timestampPickedUp", new Date("1980")],
                                    },
                                    {
                                        $eq: ["$$item.pickupLocation", "Willis Library"],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.completedCopies.0": { $exists: true } } },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    files: { $addToSet: "$files" },
                },
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$doc", { files: "$files" }],
                    },
                },
            },
            { $sort: { timestampSubmitted: -1 } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/pickupdp", auth.required, function (req, res) {
    submissions.aggregate(
        [
            { $unwind: "$files" },
            {
                $set: {
                    "files.completedCopies": {
                        $filter: {
                            input: "$files.completedCopies",
                            as: "item",
                            cond: {
                                $and: [
                                    { $eq: ["$$item.isInTransit", false] },
                                    {
                                        $lt: ["$$item.timestampPickedUp", new Date("1980")],
                                    },
                                    {
                                        $eq: ["$$item.pickupLocation", "Discovery Park"],
                                    },
                                ],
                            },
                        },
                    },
                },
            },
            { $match: { "files.completedCopies.0": { $exists: true } } },
            {
                $group: {
                    _id: "$_id",
                    doc: { $first: "$$ROOT" },
                    files: { $addToSet: "$files" },
                },
            },
            {
                $replaceRoot: {
                    newRoot: {
                        $mergeObjects: ["$doc", { files: "$files" }],
                    },
                },
            },
            { $sort: { timestampSubmitted: -1 } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

router.get("/completed", auth.required, function (req, res) {
    //load the submission page and flash any messages
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $eq: ["$$item.isPickedUp", true],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
            { $sort: { timestampSubmitted: -1 } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

//-----------------------REJECTED-----------------------
router.get("/rejected", auth.required, function (req, res) {
    //load the submission page and flash any messages
    submissions.aggregate(
        [
            {
                $set: {
                    files: {
                        $filter: {
                            input: "$files",
                            as: "item",
                            cond: {
                                $eq: ["$$item.isRejected", true],
                            },
                        },
                    },
                },
            },
            { $match: { "files.0": { $exists: true } } },
            { $sort: { timestampSubmitted: -1 } },
        ],
        function (err, data) {
            res.json({ submissions: data });
        }
    );
});

//-----------------------ALL-----------------------
router.get("/all", auth.required, function (req, res) {
    //load the submission page and flash any messages

    submissions.find({}, function (err, data) {
        //loading every single top level request FOR NOW
        res.json({ submissions: data });
    });
});

router.get("/allp", auth.required, async function (req, res) {
    //load the submission page and flash any messages
    var page = req.query.page;
    var skip = (page - 1) * numPerPage;
    var submissions = await submissions.find({}).skip(skip).limit(numPerPage);

    res.json({ submissions: data });
});

module.exports = router;
