const Email = require("email-templates");
var nodemailer = require("nodemailer");
const path = require("path");

var smtpserver = "mailhost.unt.edu";
var sender = '"SparkOrders" <no-reply.sparkorders@unt.edu>';
var portNum = 25;

var transporter = nodemailer.createTransport({
    host: smtpserver,
    port: portNum,
    secure: false,
    tls: {
        rejectUnauthorized: false,
    },
});

const email = new Email({
    message: {
        from: sender,
    },
    send: true,
    transport: transporter,
    views: {
        options: {
            extension: "pug", // <---- HERE
        },
    },
    juice: true,
    juiceSettings: {
        tableElements: ["TABLE"],
    },
    juiceResources: {
        preserveImportant: true,
        webResources: {
            relativeTo: path.join(__dirname, "pugmail", "_css"),
        },
    },
});

module.exports = {
    requestRecieved: function (submission) {
        email
            .send({
                template: path.join(__dirname, "pugmail", "requestRecieved"),
                message: {
                    to: submission.patron.email,
                },
                locals: {
                    submission: submission,
                },
            })
            .catch(console.error);
    },
};
