const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
var ldap = require("ldapjs");

router.post("/patron", async function (req, res) {
    let fileIDs = req.body.fileIDs;
    for await (let fileID of fileIDs) {
        let submission = await submissions.findOne({ "files._id": fileID });
        let file = submission.files.id(fileID);
        file.pickup.patronName = req.body.patronName;
        await submission.save();
    }
    res.status(200).send("OK");
});

router.post("/tech", async function (req, res) {
    var login = ldap.createClient({
        url: "ldaps://ldap-auth.untsystem.edu",
    });
    let fileIDs = req.body.fileIDs;

    var loginDN = "uid=" + req.body.euid + ",ou=people,o=unt";
    login.bind(loginDN, req.body.password, async function (err, res2) {
        if (err) {
            login.unbind();
            res.status(299).json({
                completed: false,
            });
        } else {
            login.unbind();
            let now = new Date();
            for await (let fileID of fileIDs) {
                let submission = await submissions.findOne({ "files._id": fileID });
                let file = submission.files.id(fileID);
                if (file.status == "WAITING_FOR_PICKUP" || file.status == "IN_TRANSIT") {
                    file.pickup.pickupEUID = req.body.euid;
                    file.status = "PICKED_UP";
                    file.pickup.timestampPickedUp = now;
                }

                await submission.save();
            }

            res.status(200).json({
                completed: true,
            });
        }
    });
});

module.exports = router;
