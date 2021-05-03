var mongoose = require("mongoose");
require("./patron.js");

var singlePrintSchema = mongoose.Schema({
    fileName: { type: String, default: "" },
    realFileName: { type: String, default: "" },
    material: { type: String, default: "" },
    infill: { type: String, default: "" },
    color: { type: String, default: "" },
    copies: { type: String, default: "" },
    notes: { type: String, default: "" },
    printLocation: { type: String, default: "" },
    pickupLocation: { type: String, default: "" },

    calculatedVolumeCm: { type: Number, default: 0 },

    isNewSubmission: { type: Boolean, default: true },
    isReviewed: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    isPendingPayment: { type: Boolean, default: false },
    isPendingWaive: { type: Boolean, default: false },
    isPaid: { type: Boolean, default: false },
    isReadyToPrint: { type: Boolean, default: false },
    isPrinted: { type: Boolean, default: false },
    isInTransit: { type: Boolean, default: false },
    isPickedUp: { type: Boolean, default: false },
    isPendingDelete: { type: Boolean, default: false },
    canBeReviewed: { type: Boolean, default: true },
    isStaleOnPickup: { type: Boolean, default: false },
    isStaleOnPayment: { type: Boolean, default: false },
    isSigned: { type: Boolean, default: false },

    signaturePath: { type: String, default: "" },

    dateSubmitted: { type: String, default: "" },
    dateReviewed: { type: String, default: "" },
    datePaid: { type: String, default: "" },
    datePrinted: { type: String, default: "" },
    datePickedUp: { type: String, default: "" },
    dateOfFirstWarning: { type: String, default: "" },
    dateOfSecondWarning: { type: String, default: "" },
    dateOfConfiscation: { type: String, default: "" },

    timestampSubmitted: { type: Date, default: "1970" },
    timestampReviewed: { type: Date, default: "1970" },
    timestampPaid: { type: Date, default: "1970" },
    timestampPrinted: { type: Date, default: "1970" },
    timestampPickedUp: { type: Date, default: "1970" },
    timestampOfFirstWarning: { type: Date, default: "1970" },
    timestampOfSecondWarning: { type: Date, default: "1970" },
    timestampOfConfiscation: { type: Date, default: "1970" },

    gcodeName: { type: String, default: "" },
    realGcodeName: { type: String, default: "" },
    slicedPrinter: { type: String, default: "" },
    slicedMaterial: { type: String, default: "" },
    timeHours: { type: Number, default: 0 },
    timeMinutes: { type: Number, default: 0 },
    grams: { type: Number, default: 0 },
    estimations: {
        slicedHours: { type: Number, default: 0 },
        slicedMinutes: { type: Number, default: 0 },
        slicedGrams: { type: Number, default: 0 },
        slicedCopies: { type: Number, default: 0 },
        totalHours: { type: Number, default: 0 },
        totalMinutes: { type: Number, default: 0 },
        totalGrams: { type: Number, default: 0 },
    },

    realGrams: { type: Number, default: 0 }, //actual grams entered after printing is finished
    completedLocation: { type: String, default: "" },

    printingData: {
        rollID: { type: String, default: "" },
        rollWeight: { type: Number, default: 0 },
        finalWeight: { type: Number, default: 0 },
        weightChange: { type: Number, default: 0 },
        copiesPrinting: { type: Number, default: 0 },
        copiesPrinted: { type: Number, default: 0 },
        location: { type: String, default: "" },
        printer: { type: String, default: "" },
        numAttempts: { type: Number, default: 0 },
        numFailedAttempts: { type: Number, default: 0 },
    },

    attempts: {
        type: [
            {
                timestampStarted: { type: Date, default: "1970" },
                timestampEnded: { type: Date, default: "1970" },
                copies: { type: Number, default: 0 },
                location: { type: String, default: "" },
                printer: { type: String, default: "" },
                isFinished: { type: Boolean, default: false },
                isSuccess: { type: Boolean, default: false },
            },
        ],
        default: [],
    },

    filaments: {
        type: [
            {
                rollID: { type: String, default: "" },
                startWeight: { type: Number, default: 0 },
                endWeight: { type: Number, default: 0 },
            },
        ],
        default: [],
    },

    copiesData: {
        unprinted: { type: Number, default: 0 },
        printing: { type: Number, default: 0 },
        inTransit: { type: Number, default: 0 },
        completed: { type: Number, default: 0 },
        pickedUp: { type: Number, default: 0 },
    },

    completedCopies: {
        type: [
            {
                isInTransit: { type: Boolean, default: false },
                pickupLocation: { type: String, default: "" },
                printedBy: { type: String, default: "" },
                timestampPrinted: { type: Date, default: "1970" },
                timestampArrived: { type: Date, default: "1970" },
                timestampPickedUp: { type: Date, default: "1970" },
                timestampOfFirstWarning: { type: Date, default: "1970" },
                timestampOfSecondWarning: { type: Date, default: "1970" },
                timestampOfConfiscation: { type: Date, default: "1970" },
            },
        ],
        default: [],
    },
    isStarted: { type: Boolean, default: false },

    techNotes: { type: String, default: "" },
    newTechNotes: [
        {
            techName: { type: String, default: "" },
            dateAdded: Date,
            notes: { type: String, default: "" },
        },
    ],
    patronNotes: { type: String, default: "" },

    approvedBy: { type: String, default: "" },
    startedBy: { type: String, default: "" },

    overrideNotes: { type: String, default: "" },

    singleCopyPrice: { type: Number, default: 0 },
    allCopiesPrice: { type: Number, default: 0 },
});

// define the schema for a single patron submission
var printSubmissionSchema = mongoose.Schema({
    patron: mongoose.model("Patron").schema,

    isForClass: { type: Boolean, default: false },
    classDetails: {
        classCode: { type: String, default: "" },
        professor: { type: String, default: "" },
        projectType: { type: String, default: "" },
    },

    isForDepartment: { type: Boolean, default: false },
    internalDetails: {
        department: { type: String, default: "" },
        project: { type: String, default: "" },
    },

    dateSubmitted: { type: String, default: "" },
    timestampSubmitted: {
        type: Date,
        default: "1970",
    },
    datePaymentRequested: { type: String, default: "" },
    timestampPaymentRequested: {
        type: Date,
        default: "1970",
    },
    datePaid: { type: String, default: "" },
    timestampPaid: {
        type: Date,
        default: "1970",
    },

    requestedPrice: { type: Number, default: 0 },
    requestedSingleCopyPrice: { type: Number, default: 0 },
    numFiles: { type: Number, default: 0 },
    allFilesReviewed: { type: Boolean, default: false },
    isPendingWaive: { type: Boolean, default: false },
    files: [singlePrintSchema], //array of actual print files
});

module.exports = mongoose.model("PrintRequest", printSubmissionSchema);
