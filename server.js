// set up ======================================================================
// nodemon shutdown please work

require("dotenv").config();

// get all the tools we need
const express = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const Grid = require("gridfs-stream");
var logger = require("./app/logger");

require("./app/models/user.js");
require("./app/models/printRequest.js");
require("./app/models/printer.js");
require("./app/models/selfServiceLog");
require("./app/models/attempt");
require("./app/models/customEmail");

const path = require("path");
const favicon = require("serve-favicon");

let server;

require("./app/pugmail");

process.once("SIGUSR2", function () {
    logger.info("closing");
    server.close(() => {
        logger.info("server closed");
        process.kill(process.pid, "SIGUSR2");
    });
});

// configuration ===============================================================
mongoose
    .connect(process.env.MONGOURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
    })
    .then((client) => {
        var gfs = Grid(client.connection.db, mongoose.mongo);
        var passport = require("passport");
        require("./app/passport")(passport); // pass passport for configuration

        app.use(express.urlencoded({ extended: true })); //parse URL ecoded data
        app.use(express.json()); //parse incoming JSON data
        app.use(passport.initialize()); //use our initialised passport instance
        app.use(cors()); //default CORS config

        app.use("/", require("./routes/router"));

        app.set("view engine", "pug");
        app.use(express.static(path.join(__dirname, "app", "pugmail", "_css")));
        app.get("/testemail", function (req, res) {
            res.render(path.join(__dirname, "app", "pugmail", "requestRecieved", "html"), {
                title: "Hey",
                message: "Hello there!",
            });
        });

        /**
         * Serve static build files only in a production environment
         */
        if (process.env.ENVIRONMENT == "production") {
            const root = require("path").join(__dirname, "..", "react-spark", "build");
            app.use(express.static(root));
            app.get("*", (req, res) => {
                res.sendFile("index.html", { root });
            });
        }

        server = https
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
                logger.info("Example app listening on port", process.env.PORT);
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

//emailer.newSubmission();
