var mongoose = require("mongoose");
require("./patron.js");
var singleFileSchema = mongoose.Schema({
    fileName: { type: String, default: "" },
    originalFileName: { type: String, default: "" },
    copyGroupID: { type: Number, default: 0 },
    stlID: { type: mongoose.Schema.ObjectId, default: null },
    gcodeID: { type: mongoose.Schema.ObjectId, default: null },
    thumbID: { type: mongoose.Schema.ObjectId, default: null },
    status: {
        type: String,
        enum: [
            "UNREVIEWED",
            "REVIEWED",
            "PENDING_PAYMENT",
            "READY_TO_PRINT",
            "PRINTING",
            "IN_TRANSIT",
            "WAITING_FOR_PICKUP",
            "PICKED_UP",
            "REJECTED",
            "STALE_ON_PAYMENT",
            "REPOSESSED",
            "LOST_IN_TRANSIT",
        ],
        default: "UNREVIEWED",
    },

    request: {
        timestampSubmitted: { type: Date, default: "1970" },
        material: { type: String, default: "Any Material" },
        infill: { type: String, default: "12.5%" },
        color: { type: String, default: "Any Color" },
        notes: { type: String, default: "" },
        pickupLocation: {
            type: String,
            enum: ["Willis Library", "Discovery Park"],
            default: "Willis Library",
            required: true,
        },
    },

    review: {
        descision: {
            type: String,
            enum: ["Accepted", "Rejected"],
            default: "Accepted",
            required: true,
        },
        reviewedByName: { type: String, default: "" },
        reviewedByEUID: { type: String, default: "" },
        timestampReviewed: { type: Date, default: "1970" }, //timestamp of last review NOT when payment was requested
        internalNotes: {
            type: [
                {
                    techName: { type: String, default: "" },
                    techEUID: { type: String, default: "" },
                    dateAdded: {
                        type: Date,
                        default: "1970",
                        required: true,
                    },
                    notes: { type: String, default: "" },
                },
            ],
            default: [],
            required: true,
        },
        patronNotes: { type: String, default: "" },
        slicedHours: { type: Number, default: 0 },
        slicedMinutes: { type: Number, default: 0 },
        slicedGrams: { type: Number, default: 0 },
        gcodeName: { type: String, default: "" },
        slicedPrinter: { type: String, default: "" },
        slicedMaterial: { type: String, default: "" },
        printLocation: {
            type: String,
            enum: ["Willis Library", "Discovery Park"],
            default: "Willis Library",
            required: true,
        },
        calculatedVolumeCm: { type: Number, default: 0 },
        gcodeVolume: { type: Number, default: 0 },
    },

    payment: {
        isPendingWaive: { type: Boolean, default: false },
        timestampPaymentRequested: {
            type: Date,
            default: "1970",
            required: true,
        },
        timestampPaid: { type: Date, default: "1970" },
        paymentType: {
            type: String,
            enum: ["PAID", "WAIVED", "UNPAID"],
            default: "UNPAID",
            required: true,
        },

        waivedBy: { type: String, default: "" },
        price: { type: Number, default: 0 },
    },

    printing: {
        printingLocation: {
            type: String,
            enum: ["Willis Library", "Discovery Park"],
            default: "Willis Library",
            required: true,
        },
        attemptIDs: {
            type: [{ type: mongoose.Schema.ObjectId, default: null }],
            default: [],
            required: true,
        },
        attemptNames: {
            type: [{ type: String, default: "" }],
            default: [],
        },
        failedAttempts: { type: Number, default: 0 },
        timestampPrinted: { type: Date, default: "1970" },
    },

    pickup: {
        patronName: { type: String, default: "" },
        pickupEUID: { type: String, default: "" },
        timestampArrivedAtPickup: { type: Date, default: "1970" },
        timestampReposessed: { type: Date, default: "1970" },
        timestampPickedUp: { type: Date, default: "1970" },
    },

    isPendingDelete: { type: Boolean, default: false },
});
// define the schema for a single patron submission
var printSubmissionSchema = mongoose.Schema({
    patron: { type: mongoose.model("Patron").schema },

    currentQueue: {
        type: String,
        enum: ["REVIEW", "PAYMENT", "PRINT", "PICKUP", "DONE"],
        default: "REVIEW",
    },

    submissionDetails: {
        submissionType: {
            type: String,
            enum: ["PERSONAL", "CLASS", "INTERNAL"],
            default: "PERSONAL",
        },

        classDetails: {
            classCode: { type: String, default: "" },
            professor: { type: String, default: "" },
            project: { type: String, default: "" },
        },

        internalDetails: {
            department: { type: String, default: "" },
            project: { type: String, default: "" },
        },

        timestampSubmitted: { type: Date, default: "1970" },
        numFiles: { type: Number, default: 0 },
    },

    files: [singleFileSchema],

    flags: {
        allFilesReviewed: { type: Boolean, default: false },
        allFilesPrinted: { type: Boolean, default: false },
        allFilesPickedUp: { type: Boolean, default: false },
        isPendingWaive: { type: Boolean, default: false },
        isPendingDelete: { type: Boolean, default: false },
        isArchived: { type: Boolean, default: false },
    },

    paymentRequest: {
        timestampPaymentRequested: { type: Date, default: "1970" },
        paymentRequestingName: { type: String, default: "" },
        paymentRequestingEUID: { type: String, default: "" },
        requestedPrice: { type: Number, default: 0 },
    },

    payment: {
        timestampPaid: { type: Date, default: "1970" },
        paymentURL: { type: String, default: "" },
        libPaymentObject: {
            type: {
                request_contents: {
                    type: {
                        account: { type: String, default: "" },
                        amount: { type: String, default: "" },
                        submissionID: { type: String, default: "" },
                        libhash: { type: String, default: "" },
                    },
                    default: null,
                },
                account: { type: String, default: "" },
                transaction_id: { type: String, default: "" },
                transaction_date: { type: String, default: "" },
                amount: { type: String, default: "" },
                libhash: { type: String, default: "" },
            },
            default: null,
        },
    },

    pickup: {
        timestampPickupRequested: { type: Date, default: "1970" },
        timestampFirstWarning: { type: Date, default: "1970" },
        timestampFinalWarning: { type: Date, default: "1970" },
        timestampReposessed: { type: Date, default: "1970" },
    },

    emails: {
        type: [
            {
                templateName: { type: String, default: "" },
                timestampSent: { type: Date, default: "1970" },
            },
        ],
    },
});

module.exports = mongoose.model("Submission", printSubmissionSchema);
