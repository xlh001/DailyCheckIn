const axios = require("axios");
const logger = require("../utils/logger");
const { request } = require("../utils/request");

class exampleTask {
  constructor(token) {
    this.token = token.trim();
    this.log = ""; // 用于存储日志

    this.urls = {};

    this.session = axios.create({
      headers: {
        "x-api-key": this.token,
      },
    });
  }

  async signin() {
    const data = JSON.stringify({ task_name: "每日签到" });
    const res = await request(this.session, "post", this.urls.signin, data);
    if (res && res.success) {
      this.signinResult = true;
      logger.logInfo("成功签到并领取积分");
      this.log += `签到成功\n`;
    } else {
      logger.logWarn("签到失败");
      this.log += `签到失败\n`;
    }
  }

  getLog() {
    return this.log;
  }
}

module.exports = async function (config) {
  const tokens =
    process.env.exampleTask_TOKEN || config.exampleTask.token || "";

  const tokenList = Array.isArray(tokens)
    ? tokens
    : tokens
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

  if (tokenList.length === 0) {
    logger.logError("❌ 未提供有效的 exampleTask_TOKEN");
    return "❌ 未提供有效的 exampleTask_TOKEN";
  }

  let aggregatedLog = [];

  for (const token of tokenList) {
    try {
      const ry = new exampleTask(token);

      aggregatedLog.push({
        log: ry.getLog(),
      });
    } catch (error) {
      logger.logError(
        `Token ${token.slice(0, 4)}**** 处理失败: ${error.message}`
      );
    }
  }

  const result = aggregatedLog.map((entry) => `${entry.log}`).join("\n");

  return result || "【模板】：无任务执行结果";
};
