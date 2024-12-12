// utils/logger.js
const winston = require("winston");

// 创建日志记录器
const logger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    new winston.transports.File({ filename: "app.log" }),
  ],
});

// 日志记录函数
const logInfo = (message) => {
  logger.info(message);
};

const logError = (message) => {
  logger.error(message);
};

const logWarn = (message) => {
  logger.warn(message);
};

module.exports = {
  logInfo,
  logError,
  logWarn,
};
