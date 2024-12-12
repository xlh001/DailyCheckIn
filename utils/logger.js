const winston = require("winston");

// 创建日志记录器
const logger = winston.createLogger({
  level: "info", // 默认日志级别，可调整为 debug、warn、error 等
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // 仅输出到控制台
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
