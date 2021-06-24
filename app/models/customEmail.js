var mongoose = require("mongoose");

// define the schema for a single patron
var emailSchema = mongoose.Schema({
    templateName: { type: String, default: "" },
    bodyText: { type: String, default: "" },
});

module.exports = mongoose.model("Email", emailSchema);
