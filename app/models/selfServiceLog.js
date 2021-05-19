var mongoose = require("mongoose");

var selfServiceLogSchema = mongoose.Schema({
    printerName: { type: String, default: "" },
    printerID: { type: mongoose.Schema.ObjectId, default: null },
    rollID: { type: String, default: "" },
    rollStartWeight: { type: Number, default: 0 },
    rollEndWeight: { type: Number, default: 0 },
    patronName: { type: String, default: "" },
    checkedOut: { type: Date, default: "1970" },
    checkedIn: { type: Date, default: "1970" },
    checkedOutBy: { type: String, default: "" },
    checkedInBy: { type: String, default: "" },
});

module.exports = mongoose.model("SelfServiceLog", selfServiceLogSchema);
