var express = require("express");
var router = express.Router();

router.use("/users", require("./endpoints/userRoutes.js"));
router.use("/emails", require("./endpoints/editEmails"));
router.use("/submissions", require("./endpoints/updateSubmissions"));
router.use("/submissions", require("./endpoints/getSubmissions"));
router.use("/submit", require("./endpoints/addSubmission"));
router.use("/download", require("./endpoints/downloadFiles"));
router.use("/attempts", require("./endpoints/attempts"));
router.use("/printers", require("./endpoints/printers"));
router.use("/payment", require("./endpoints/payment"));
router.use("/pickup", require("./endpoints/pickup"));

router.get("/testerror", function (req, res) {
    res.status(404).send("You asked for it");
});

module.exports = router;
