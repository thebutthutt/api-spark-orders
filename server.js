// set up ======================================================================
// nodemon shutdown please work

require("dotenv").config();

process.once("SIGUSR2", function () {
    gracefulShutdown(function () {
        process.kill(process.pid, "SIGUSR2");
    });
});

// get all the tools we need
var express = require("express");
var https = require("https");
var http = require("http");
var fs = require("fs");
var app = express();
var port = process.env.PORT;
const cors = require("cors");
var mongoose = require("mongoose");

require("./app/models/user.js");
require("./app/models/printRequest.js");

var path = require("path");
var favicon = require("serve-favicon");

console.log(process.pid);

// configuration ===============================================================
mongoose
    .connect(process.env.MONGO, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    })
    .then(() => {
        var passport = require("passport");
        require("./app/passport")(passport); // pass passport for configuration

        app.use(express.urlencoded({ extended: true })); //parse URL ecoded data
        app.use(express.json()); //parse incoming JSON data
        app.use(passport.initialize()); //use our initialised passport instance
        //app.use(cors()); //default CORS config

        app.use("/", require("./routes/router"));

        app.get("/", function (req, res) {
            res.send("hello world");
        });

        var server = https
            .createServer(
                {
                    key: fs.readFileSync("./config/npserver2048.key"),
                    cert: fs.readFileSync("./config/sparkorders_library_unt_edu_cert.cer"),
                    passphrase: "THEsparkMakerSPACE",
                    ciphers: [
                        "ECDHE-RSA-AES256-SHA384",
                        "AES256-SHA256",
                        "!RC4",
                        "HIGH",
                        "!MD5",
                        "!aNULL",
                        "!EDH",
                        "!EXP",
                        "!SSLV2",
                        "!eNULL",
                    ].join(":"),
                    honorCipherOrder: true,
                },
                app
            )
            .listen(process.env.PORT, function () {
                console.log("Example app listening on port", process.env.PORT);
            });

        //sets up the websocket for signature pads
        //require("./app/websocket.js")(server);

        //var tester = require("./tester.js");
        //http server to redirect to https
        http.createServer(function (req, res) {
            // 301 redirect (reclassifies google listings)
            res.writeHead(301, {
                Location: "https://" + req.headers["host"] + req.url,
            });
            res.end();
        }).listen(process.env.HTTP, "0.0.0.0");
    }); // connect to our database

function gracefulShutdown(callback) {
    console.log("closing");
    server.close(() => {
        console.log("server closed");
        callback();
    });
}

//emailer.newSubmission();
