const express = require("express");
const router = express.Router();
const passport = require("passport");
const auth = require("../auth");
const mongoose = require("mongoose");
const users = mongoose.model("User");

router.post("/login", function (req, res, next) {
    passport.authenticate("local-login", { session: false }, (err, passportUser) => {
        if (passportUser) {
            return res.status(200).json(passportUser.toAuthJSON());
        } else {
            return res.status(400).json({ error: "login failed" });
        }
    })(req, res, next);
});

router.get("/info/:euid", auth.required, async function (req, res) {
    let requestEUID = req.params.euid;

    let thisUser = await users.findOne({ "local.euid": requestEUID });
    let formattedUser = {
        name: thisUser.name,
        euid: thisUser.local.euid,
        isAdmin: thisUser.isSuperAdmin,
        id: thisUser._id,
    };

    res.status(200).json({ formattedUser: formattedUser });
});

router.get("/list", auth.admin, async function (req, res) {
    let allUsers = await users.find({});
    res.status(200).json({ users: allUsers });
});

router.post("/updatename", auth.required, async function (req, res) {
    let requestEUID = req.body.euid;
    let newName = req.body.name;
    let thisUser = await users.findOne({ "local.euid": requestEUID });
    thisUser.name = newName;
    await thisUser.save();
    res.status(200).send("OK");
});

router.post("/update", auth.admin, async function (req, res) {
    let userData = req.body.users;
    let changedIDs = req.body.changedIDs;

    for await (let thisUser of userData) {
        if (changedIDs.includes(thisUser._id)) {
            await users.findByIdAndUpdate(thisUser._id, {
                name: thisUser.name,
                isSuperAdmin: thisUser.isSuperAdmin,
            });
        }
    }

    res.status(200).send("OK");
});

//just checks the JWT using auth.required and sends results to frontend
router.get("/validatejwt", auth.required, function (req, res) {
    res.status(200).send("OK");
});

module.exports = router;
