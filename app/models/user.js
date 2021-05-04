var mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// define the schema for our user model
var userSchema = mongoose.Schema({
    local: {
        euid: String,
    },
    email: String,
    name: String,
    isSuperAdmin: Boolean,
});

/**
 * This creates a new JWT and fills the payload with the euid
 * and the _id of the requesting user
 */
userSchema.methods.generateJWT = function () {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 1);
    //24 hour expiration date

    return jwt.sign(
        {
            name: this.name,
            euid: this.local.euid,
            isAdmin: this.isSuperAdmin,
            id: this._id,
            exp: parseInt(expirationDate.getTime() / 1000, 10),
        },
        process.env.SECRET
    );
};

/**
 * Returns a new signed JWT in the format we want
 */
userSchema.methods.toAuthJSON = function () {
    return {
        success: true,
        token: this.generateJWT(),
    };
};

// create the model for users and expose it to our app
module.exports = mongoose.model("User", userSchema);
