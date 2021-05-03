var express = require("express");
var router = express.Router();

const auth = require("./auth");

router.use("/users", require("./endpoints/userRoutes.js"));
router.use("/prints", require("./endpoints/printRoutes.js"));
router.use("/files", require("./endpoints/fileRoutes"));

module.exports = router;
