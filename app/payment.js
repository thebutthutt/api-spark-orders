const base_url = "https://payments.library.unt.edu/payment/";
const account = process.env.PAYMENT_ACCOUNT;
var crypto = require("crypto");
var newmailer = require("./emailer.js");

const secret_key = process.env.PAYMENT_KEY;

function generateURL(amount, name, submissionID) {
    var concatString = "";
    var newURL = new URL(base_url);
    concatString = concatString.concat(account, amount, name, submissionID, secret_key);

    var otherHash = crypto.createHash("md5").update(concatString).digest("hex");

    newURL.searchParams.append("account", account);
    newURL.searchParams.append("amount", amount);
    newURL.searchParams.append("contact_name", name);
    newURL.searchParams.append("submissionID", submissionID);
    newURL.searchParams.append("libhash", otherHash);

    return newURL;
}

module.exports = {
    completeReview: function (submission) {
        let finalPaymentAmount = 0.0;
        let acceptedFiles = [];
        let rejectedFiles = [];

        for (var file of submission.files) {
            if (file.review.descision == "Accepted") {
                finalPaymentAmount += Math.max(file.review.slicedHours + file.review.slicedMinutes / 60, 1);
                acceptedFiles.push({
                    filename: file.originalName,
                    notes: file.review.patronNotes,
                });
            } else {
                rejectedFiles.push({
                    filename: file.originalName,
                    notes: file.review.patronNotes,
                });
            }
        }

        finalPaymentAmount = finalPaymentAmount.toFixed(2);
        let paymentURL = { href: "" };

        if (finalPaymentAmount >= 1) {
            var nameString = "";
            nameString = nameString.concat(submission.patron.fname, " ", submission.patron.lname);
            paymentURL = generateURL(finalPaymentAmount, nameString, submission._id);
        }

        newmailer.requestPayment(submission, acceptedFiles, rejectedFiles, finalPaymentAmount, paymentURL.href);
    },

    //generate a URL for the patron to pay thrpugh
    generatePaymentURL: function (
        contact_name,
        email,
        acceptedFiles,
        acceptedMessages,
        rejectedFiles,
        rejectedMessages,
        amount,
        submissionID
    ) {
        var concatString = "";
        var newURL = new URL(base_url);
        concatString = concatString.concat(account, amount, contact_name, submissionID, secret_key);

        var otherHash = crypto.createHash("md5").update(concatString).digest("hex");

        newURL.searchParams.append("account", account);
        newURL.searchParams.append("amount", amount);
        newURL.searchParams.append("contact_name", contact_name);
        newURL.searchParams.append("submissionID", submissionID);
        newURL.searchParams.append("libhash", otherHash);

        emailer
            .requestPayment(email, acceptedFiles, acceptedMessages, rejectedFiles, rejectedMessages, newURL.href)
            .catch(console.error);
    },

    sendPaymentEmail: function (submission, amount, numRejected) {
        var nameString = "";
        nameString = nameString.concat(submission.patron.fname, " ", submission.patron.lname);

        var concatString = "";
        var newURL = new URL(base_url);
        concatString = concatString.concat(account, amount, nameString, submission._id, secret_key);

        var otherHash = crypto.createHash("md5").update(concatString).digest("hex");

        newURL.searchParams.append("account", account);
        newURL.searchParams.append("amount", amount);
        newURL.searchParams.append("contact_name", nameString);
        newURL.searchParams.append("submissionID", submission._id);
        newURL.searchParams.append("libhash", otherHash);

        if (numRejected > 0) {
            newmailer.someApproved(submission, amount, newURL.href);
        } else {
            newmailer.allApproved(submission, amount, newURL.href);
        }
    },

    //validate an incoming payment confirmation url
    validatePaymentURL: function (query, callback) {
        concatString = "";
        var innerMatch = false,
            outerMatch = false;

        var request_contents = JSON.parse(query.request_contents);

        //concatenate all the params
        concatString = concatString.concat(
            request_contents.account,
            request_contents.amount,
            request_contents.contact_name,
            request_contents.submissionID,
            secret_key
        );

        //hash the params
        var otherHash = crypto.createHash("md5").update(concatString).digest("hex");

        //does is match the hash sent over?
        if (otherHash == request_contents.libhash) {
            innerMatch = true;
        }

        concatString = "";
        concatString = concatString.concat(
            query.account,
            query.amount,
            query.request_contents,
            query.transaction_date,
            query.transaction_id,
            secret_key
        );
        otherHash = crypto.createHash("md5").update(concatString).digest("hex");

        //does is match the hash sent over?
        if (otherHash == query.libhash) {
            outerMatch = true;
        }

        if (typeof callback == "function") {
            callback(innerMatch, outerMatch, request_contents.submissionID);
        }
    },

    handlePaymentComplete: function (req, callback) {
        //validate the incoming payment confirmation
        this.validatePaymentURL(req.query, function (innerMatch, outerMatch, submissionID) {
            if (innerMatch == true && outerMatch == true) {
                callback(true, submissionID);
            } else {
                console.log("Hashes invalid");
                callback(false, submissionID);
            }
        });
    },
};
