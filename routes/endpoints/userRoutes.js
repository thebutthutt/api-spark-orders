const express = require("express");
const router = express.Router();
const passport = require("passport");
const auth = require("../auth");

router.post("/login", function (req, res, next) {
    passport.authenticate("local-login", { session: false }, (err, passportUser) => {
        if (passportUser) {
            return res.status(200).json(passportUser.toAuthJSON());
        } else {
            return res.status(400).json({ error: "login failed" });
        }
    })(req, res, next);
});

//just checks the JWT using auth.required and sends results to frontend
router.get("/validatejwt", auth.required, function (req, res) {
    res.status(200).send("OK");
});

module.exports = router;
