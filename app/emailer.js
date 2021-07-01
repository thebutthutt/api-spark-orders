/** @format */

const Email = require("email-templates");
const { template, reject } = require("lodash");
var nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const submissions = mongoose.model("Submission");
const path = require("path");
const logger = require("winston");
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
            relativeTo: path.join(__dirname, "emails", "_css"),
        },
    },
    preview: false,
});

module.exports = {
    requestPayment: async function (submission, acceptedFiles, rejectedFiles, amount, url, callback) {
        var recipient = submission.patron.email;

        if (acceptedFiles.length < 1) {
            email
                .send({
                    template: path.join(__dirname, "emails", "allRejected"),
                    message: {
                        to: recipient,
                    },
                    locals: {
                        submission: submission,
                        allFiles: rejectedFiles,
                    },
                })
                .catch(console.error);
        } else {
            email
                .send({
                    template: path.join(__dirname, "emails", "requestPayment"),
                    message: {
                        to: recipient,
                    },
                    locals: {
                        submission: submission,
                        acceptedFiles: acceptedFiles,
                        rejectedFiles: rejectedFiles,
                        amount: amount,
                        url: url,
                    },
                })
                .then(async () => {
                    let dbSubmission = await submissions.findById(submission._id);
                    dbSubmission.payment.paymentURL = url;
                    await dbSubmission.save();
                    callback();
                })
                .catch(console.error);
        }
    },
    newSubmission: function (submission) {
        var recipient = submission.patron.email;
        var files = submission.files;
        var fileNames = files.map(function (file) {
            return file.realFileName;
        });
        email
            .send({
                template: path.join(__dirname, "emails", "newSubmission"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    fileNames: fileNames,
                },
            })
            .then(logger.info("sent new submission email to", recipient))
            .catch(console.error);
    },
    allApproved: function (submission, amount, url) {
        var recipient = submission.patron.email;
        var files = submission.files;
        var inputData = files.map(function (file) {
            return {
                fileName: file.realFileName,
                grams: file.estimations.totalGrams,
                timeHours: file.estimations.totalHours,
                timeMinutes: file.estimations.totalMinutes,
                notes: file.patronNotes,
            };
        });
        email
            .send({
                template: path.join(__dirname, "emails", "allApproved"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    allFiles: inputData,
                    amount: amount,
                    url: url,
                },
            })
            .then(logger.info("sent all approved email to", recipient))
            .catch(console.error);
    },
    someApproved: function (submission, amount, url) {
        var recipient = submission.patron.email;
        var files = submission.files;

        var acceptedFiles = files.reduce(function (result, file) {
            if (file.isRejected == false) {
                result.push({
                    fileName: file.realFileName,
                    grams: file.estimations.totalGrams,
                    timeHours: file.estimations.totalHours,
                    timeMinutes: file.estimations.totalMinutes,
                    notes: file.patronNotes,
                });
            }
            return result;
        }, []);

        var rejectedFiles = files.reduce(function (result, file) {
            if (file.isRejected == true) {
                result.push({
                    fileName: file.realFileName,
                    notes: file.patronNotes,
                });
            }
            return result;
        }, []);

        logger.info(acceptedFiles);
        logger.info(rejectedFiles);

        email
            .send({
                template: path.join(__dirname, "emails", "someApproved"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    acceptedFiles: acceptedFiles,
                    rejectedFiles: rejectedFiles,
                    amount: amount,
                    url: url,
                },
            })
            .then(logger.info("sent some approved email to", recipient))
            .catch(console.error);
    },
    allRejected: function (submission) {
        var recipient = submission.patron.email;
        var files = submission.files;

        var inputData = files.map(function (file) {
            return {
                fileName: file.realFileName,
                notes: file.patronNotes,
            };
        });

        email
            .send({
                template: path.join(__dirname, "emails", "allRejected"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    allFiles: inputData,
                },
            })
            .then(logger.info("sent all rejected email to", recipient))
            .catch(console.error);
    },
    modificationRequired: function (submission) {},
    paymentThankYou: function (submission) {},
    paymentWaived: function (submission) {
        var recipient = submission.patron.email;
        var files = submission.files;
        var fileNames = files.map(function (file) {
            return file.realFileName;
        });

        email
            .send({
                template: path.join(__dirname, "emails", "paymentWaived"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    fileNames: fileNames,
                },
            })
            .then(logger.info("sent payment waived email to", recipient))
            .catch(console.error);
    },
    inTransit: function (submission, readyFile) {
        var recipient = submission.patron.email;
        email
            .send({
                template: path.join(__dirname, "emails", "inTransit"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    readyFile: readyFile,
                },
            })
            .catch(console.error);
    },
    readyForPickup: function (submission, readyFile) {
        var recipient = submission.patron.email;
        email
            .send({
                template: path.join(__dirname, "emails", "fileReady"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    readyFile: readyFile,
                },
            })
            .catch(console.error);
    },
    //one week late
    stillWaiting: function (submission, one) {
        var recipient = submission.patron.email;
        email
            .send({
                template: path.join(__dirname, "emails", "firstWarning"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    allFiles: one,
                },
            })
            .catch(console.error);
    },
    //two weeks late
    finalWarning: function (submission, two) {
        var recipient = submission.patron.email;
        email
            .send({
                template: path.join(__dirname, "emails", "finalWarning"),
                message: {
                    to: recipient,
                },
                locals: {
                    submission: submission,
                    allFiles: two,
                },
            })
            .catch(console.error);
    },
    //three weeks late
    repoPrint: function (submission) {},
};
