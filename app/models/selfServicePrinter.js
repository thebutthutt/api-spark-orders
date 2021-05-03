var mongoose = require("mongoose");

var selfServicePrinterSchema = mongoose.Schema({
    printerName: { type: String, default: "" },
    printerBarcode: { type: String, default: "" },
    isCheckedOut: { type: Boolean, default: false },
    currentSelfServiceLog: { type: String, default: "" },
});

module.exports = mongoose.model("SelfServicePrinter", selfServicePrinterSchema);
