var mongoose = require("mongoose");

// define the schema for a single patron
var patronSchema = mongoose.Schema({
    fname: String,
    lname: String,
    email: String,
    euid: String,
    phone: String,
});

module.exports = mongoose.model("Patron", patronSchema);
