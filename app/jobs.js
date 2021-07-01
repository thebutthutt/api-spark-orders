var schedule = require("node-schedule");
const moment = require("moment");
var emailer = require("./emailer.js");
var printRequestModel = require("./models/printRequest");
const logger = require("../app/logger");
module.exports = function (constants) {
    /*
		This finds all the prints waiting for 
		the patron to pick them up still.

		Those over one week, two weeks, and
		three weeks old will be marked with
		the appropriate flags.

		Additionally, those over 3 weeks old 
		will be marked stale on pickup and 
		removed from the waiting for pickup
		queue.
	*/
    var staleOnPickup = function () {
        var today = moment().format(constants.format);
        var oneWeek = moment().subtract(6, "days").format(constants.format); //subtracting six days feom today to satisfy anything before being 7+ days old
        var twoWeeks = moment().subtract(13, "days").format(constants.format);
        var threeWeeks = moment().subtract(20, "days").format(constants.format);

        printRequestModel.find(
            {
                //the file is printed but not picked up yet
                files: {
                    $elemMatch: {
                        isPrinted: true,
                        isPickedUp: false,
                    },
                },
            },
            function (err, result) {
                if (err) {
                    logger.info(err);
                } else {
                    result.forEach((submission) => {
                        var three = [],
                            two = [],
                            one = [];

                        for (const file of submission.files) {
                            if (moment(file.datePrinted, "M-D-YY").isBefore(moment(threeWeeks, "M-D-YY"))) {
                                //file is 3 weeks old, we keep it
                                if (file.dateOfConfiscation == "Not yet sent") {
                                    //third contact has not been sent
                                    file.dateOfConfiscation = today;
                                    file.isStaleOnPickup = true;
                                    three.push(file);
                                }
                            } else if (moment(file.datePrinted, "M-D-YY").isBefore(moment(twoWeeks, "M-D-YY"))) {
                                //file is 2 weeks old, another contact
                                if (file.dateOfSecondWarning == "Not yet sent") {
                                    //second contact has not been sent
                                    file.dateOfSecondWarning = today;
                                    two.push(file);
                                }
                            } else if (moment(file.datePrinted, "M-D-YY").isBefore(moment(oneWeek, "M-D-YY"))) {
                                //file is one week old, send a contact
                                if (file.dateOfFirstWarning == "Not yet sent") {
                                    //first contact has not been sent
                                    file.dateOfFirstWarning = today;
                                    one.push(file);
                                }
                            }
                        }
                        submission.save();

                        if (three.length > 0) {
                            logger.info("Repo prints", three);
                            emailer.repoPrint(submission, three);
                        }

                        if (two.length > 0) {
                            logger.info("final warning prints", two);
                            emailer.finalWarning(submission, two);
                        }

                        if (one.length > 0) {
                            logger.info("warning prints", one);
                            emailer.stillWaiting(submission, one);
                        }
                    });
                }
            }
        );
    };

    var staleOnPayment = async function () {
        var twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        var stale = await printRequestModel.find({
            "files.isPendingPayment": true,
        });

        for (var submission of stale) {
            //logger.info(submission);
            for (var file of submission.files) {
                var reviewed = new Date(file.dateReviewed);
                if (reviewed <= twoWeeksAgo) {
                    file.isStaleOnPayment = true;
                }
            }
            submission.save();
        }
    };

    /*
		Finds all the quarantine bookings today 
		and makes a list of all the unique items 
		that need to be cleaned. 

		First deletes any existing items that
		need to be cleaned on the assumption 
		that this will only run once a day.	

		if the server restarts the data of what 
		has been cleaned will NOT persist! 
	*/

    schedule.scheduleJob("1 0 * * *", () => {
        //run once every day at midnight and one minute just in case idk im nervous
        staleOnPickup();
        staleOnPayment();
        //needsCleaning();
    });

    staleOnPickup();
    staleOnPayment();
    //needsCleaning();
};
