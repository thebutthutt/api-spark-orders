module.exports = {
    apps: [
        {
            name: "spark-react",
            script: "npm",
            args: "start",
            error_file: "logs/spark/err.log",
            out_file: "logs/spark/out.log",
            log_file: "logs/spark/combined.log",
            time: true,
            max_restarts: 10,
            autorestart: true,
            watch: false,
        },
        {
            name: "mongodb",
            script: "mongod",
        },
    ],
};
