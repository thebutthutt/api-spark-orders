const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
var multer = require("multer");
const submissions = mongoose.model("Submission");

router.post(
    "/",
    multer({
        storage: multer.diskStorage({
            destination: function (req, file, cb) {
                cb(null, path.join(__dirname, "../../Uploads/STLs/"));
            },

            // By default, multer removes file extensions so let's add them back
            filename: function (req, file, cb) {
                cb(null, Date.now() + "-" + file.originalname.split(".")[0] + path.extname(file.originalname));
            },
        }),
    }).any(),
    async function (req, res) {
        //req.body
        //req.files
        /**
         *
         * [
         * material,
         * infill,
         * color,
         * copies,
         * notes
         * ]
         */
    }
);

module.exports = router;
