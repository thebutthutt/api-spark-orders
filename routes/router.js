var express = require("express");
var router = express.Router();

const auth = require("./auth");

router.use("/users", require("./endpoints/userRoutes.js"));
router.use("/prints", require("./endpoints/printRoutes.js"));
router.use("/submit", require("./endpoints/submissionRoutes.js"));
router.use("/files", require("./endpoints/fileRoutes"));
router.use("/download", require("./endpoints/downloadRoutes"));

module.exports = router;
