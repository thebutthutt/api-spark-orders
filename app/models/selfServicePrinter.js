var mongoose = require("mongoose");

var selfServicePrinterSchema = mongoose.Schema({
    printerName: { type: String, default: "" },
    printerBarcode: { type: String, default: "" },
    isCheckedOut: { type: Boolean, default: false },
    currentSelfServiceLog: { type: String, default: "" },
    runningJobID: { type: mongoose.Schema.ObjectId, default: null },
});

module.exports = mongoose.model("SelfServicePrinter", selfServicePrinterSchema);
