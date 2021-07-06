const winston = require("winston");
const winstonTimestampColorize = require("winston-timestamp-colorize");

const myFormat = winston.format.combine(
    winston.format.timestamp({
        format: "YYYY.MM.DD HH:mm:ss.SSS",
    }),
    winstonTimestampColorize({ color: "yellow" }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.prettyPrint(),
    winston.format.printf(({ message, timestamp }) => {
        return `[${timestamp}]:  ${message}`;
    })
);

const logger = winston.createLogger({
    format: myFormat,
    transports: [new winston.transports.Console()],
});

module.exports = logger;
