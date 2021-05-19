var mongoose = require("mongoose");

var gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "uploads",
    useUnifiedTopology: true,
});

module.exports = gfs;
