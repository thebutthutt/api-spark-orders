var mongoose = require("mongoose");

var printerSchema = mongoose.Schema({
    model: { type: String, default: "" },
    name: { type: String, default: "" },
    barcode: { type: String, default: "" },
    description: { type: String, default: "" },
    serviceLevel: { type: String, enum: ["FULL_SERVICE", "SELF_SERVICE"], default: "FULL_SERVICE" },
    location: {
        type: String,
        enum: ["Willis Library", "Discovery Park"],
        default: "Willis Library",
    },
    status: { type: String, enum: ["PRINTING", "IDLE"], default: "IDLE" },
    attemptIDs: { type: [{ type: mongoose.Schema.ObjectId, default: null }], default: [] },
    selfServiceLogIDs: { type: [{ type: mongoose.Schema.ObjectId, default: null }], default: [] },
});

module.exports = mongoose.model("Printer", printerSchema);
