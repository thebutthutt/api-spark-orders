const Email = require("email-templates");
var nodemailer = require("nodemailer");
const path = require("path");
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const emails = mongoose.model("Email");
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
    preview: false,
    send: true,
    transport: transporter,
    views: {
        options: {
            extension: "ejs", // <---- HERE
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
    sendEmail: async function (templateName, submission) {
        let emailTemplate = await emails.findOne({ templateName: templateName });
        email
            .send({
                template: path.join(__dirname, "pugmail", "base"),
                message: {
                    to: submission.patron.email,
                },
                locals: {
                    subject: emailTemplate.subject,
                    bodyText: emailTemplate.bodyText,
                    submission: submission,
                    detailLink: "http://sparkorders.library.unt.edu/submission/" + submission._id,
                },
            })
            .then(async () => {
                submission.emails.push({
                    templateName: templateName,
                    timestampSent: new Date(),
                });

                await submission.save();
            })
            .catch(console.error);
    },
};
