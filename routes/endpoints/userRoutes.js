const express = require("express");
const router = express.Router();
const passport = require("passport");

router.post("/login", function (req, res, next) {
    passport.authenticate("local-login", { session: false }, (err, passportUser) => {
        if (passportUser) {
            return res.status(200).json(passportUser.toAuthJSON());
        } else {
            return res.status(400).json({ error: "login failed" });
        }
    })(req, res, next);
});

module.exports = router;
