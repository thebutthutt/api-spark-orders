const base_url = "https://payments.library.unt.edu/payment/";
var crypto = require("crypto");
//var newmailer = require("./emailer.js");
const emailer = require("./pugmail");
const account = process.env.PAYMENT_ACCOUNT;
const secret_key = process.env.PAYMENT_KEY;

function generateURL(amount, submissionID) {
    var concatString = "";
    var newURL = new URL(base_url);
    concatString = concatString.concat(account, amount, submissionID, secret_key);
    console.log("generated concat", concatString);

    var otherHash = crypto.createHash("md5").update(concatString).digest("hex");
    console.log("generated hash", otherHash);

    newURL.searchParams.append("account", account);
    newURL.searchParams.append("amount", amount);
    newURL.searchParams.append("submissionID", submissionID);
    newURL.searchParams.append("libhash", otherHash);

    return newURL;
}

module.exports = {
    completeReview: async function (submission, finalPaymentAmount, acceptedFiles, rejectedFiles, callback) {
        let paymentURL = { href: "" };
        if (finalPaymentAmount >= 1) {
            paymentURL = generateURL(finalPaymentAmount, submission._id);
        }

        // newmailer.requestPayment(
        //     submission,
        //     acceptedFiles,
        //     rejectedFiles,
        //     finalPaymentAmount,
        //     paymentURL.href,
        //     function () {
        //         callback();
        //     }
        // );
        await emailer.sendEmail("submissionReviewed", submission);
        callback(paymentURL.href);
    },

    //validate an incoming payment confirmation url
    validatePaymentURL: async function (query) {
        return new Promise((resolve, reject) => {
            concatString = "";
            var innerMatch = false,
                outerMatch = false;

            var request_contents = JSON.parse(query.request_contents);

            //concatenate all the params
            concatString = concatString.concat(
                request_contents.account,
                request_contents.amount,
                //request_contents.contact_name,
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

            let saveObject = query;
            saveObject.request_contents = request_contents;

            resolve({
                isValid: innerMatch && outerMatch,
                submissionID: request_contents.submissionID,
                amountPaid: query.amount,
                datePaid: query.transaction_date,
                libPaymentObject: saveObject,
            });
        });
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
