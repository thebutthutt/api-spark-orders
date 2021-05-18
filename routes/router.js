var express = require("express");
var router = express.Router();

router.use("/users", require("./endpoints/userRoutes.js"));
router.use("/submissions", require("./endpoints/submissionManagement.js"));
router.use("/submissions", require("./endpoints/getSubmissions"));
router.use("/submit", require("./endpoints/submitRequest"));
router.use("/download", require("./endpoints/downloadFiles"));

module.exports = router;
