module.exports = {
    apps: [
        {
            name: "mongod",
            script: "mongod",
            args: "--dbpath /var/lib/mongo",
            error_file: "logs/mongo/err.log",
            out_file: "logs/mongo/out.log",
            log_file: "logs/mongo/combined.log",
            time: true,
        },
    ],
};
