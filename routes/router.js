var express = require("express");
var router = express.Router();

router.use("/users", require("./endpoints/userRoutes.js"));
router.use("/submissions", require("./endpoints/updateSubmissions"));
router.use("/submissions", require("./endpoints/getSubmissions"));
router.use("/submit", require("./endpoints/addSubmission"));
router.use("/download", require("./endpoints/downloadFiles"));
router.use("/attempts", require("./endpoints/attempts"));
router.use("/printers", require("./endpoints/printers"));

module.exports = router;
