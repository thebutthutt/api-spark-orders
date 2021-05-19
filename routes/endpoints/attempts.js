const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const attempts = mongoose.model("Attempt");
const auth = require("../auth");

router.post("/new", auth.required, async function (req, res) {});

router.post("/update/:attemptID", auth.required, async function (req, res) {});

module.exports = router;
