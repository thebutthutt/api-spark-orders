var mongoose = require("mongoose");
require("./patron.js");
var singleFileSchema = mongoose.Schema({
    fileName: { type: String, default: "" },
    originalFileName: { type: String, default: "" },

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
            "STALE_ON_PICKUP",
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
        reviewedBy: { type: String, default: "" },
        timestampReviewed: { type: Date, default: "1970" },
        internalNotes: {
            type: [
                {
                    techName: { type: String, default: "" },
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
        originalGcodeName: { type: String, default: "" },
        slicedPrinter: { type: String, default: "" },
        slicedMaterial: { type: String, default: "" },
        printLocation: {
            type: String,
            enum: ["Willis Library", "Discovery Park"],
            default: "Willis Library",
            required: true,
        },
        calculatedVolumeCm: { type: Number, default: 0 },
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
        timestampPrinted: { type: Date, default: "1970" },
    },

    pickup: {
        timestampArrivedAtPickup: { type: Date, default: "1970" },
        timestampReposessed: { type: Date, default: "1970" },
        timestampPickedUp: { type: Date, default: "1970" },
    },

    isPendingDelete: { type: Boolean, default: false },
});
// define the schema for a single patron submission
var printSubmissionSchema = mongoose.Schema({
    patron: { type: mongoose.model("Patron").schema },
    isForClass: { type: Boolean, default: false },
    classCode: { type: String, default: "" },
    professor: { type: String, default: "" },
    projectType: { type: String, default: "" },
    isForDepartment: { type: Boolean, default: false },
    department: { type: String, default: "" },
    departmentProject: { type: String, default: "" },
    timestampSubmitted: { type: Date, default: "1970" },
    timestampPaymentRequested: { type: Date, default: "1970" },
    timestampPaid: { type: Date, default: "1970" },
    timestampPickupRequested: { type: Date, default: "1970" },
    requestedPrice: { type: Number, default: 0 },
    numFiles: { type: Number, default: 0 },
    allFilesReviewed: { type: Boolean, default: false },
    allFilesPrinted: { type: Boolean, default: false },
    allFilesPickedUp: { type: Boolean, default: false },
    isPendingWaive: { type: Boolean, default: false },
    files: [singleFileSchema],
});
module.exports = mongoose.model("Submission", printSubmissionSchema);
