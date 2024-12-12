const axios = require("axios");
const logger = require("../utils/logger");
const { request } = require("../utils/request");

class RainYun {
  constructor(token) {
    this.token = token.trim();
    this.signinResult = false;
    this.points = null;
    this.log = ""; // 用于存储日志

    this.urls = {
      signin: "https://api.v2.rainyun.com/user/reward/tasks",
      logout: "https://api.v2.rainyun.com/user/logout",
      query: "https://api.v2.rainyun.com/user/",
    };

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

  async query() {
    const res = await request(this.session, "get", this.urls.query);
    if (res && res.success && res.data && res.data.data) {
      const name = res.data.data.Name || res.data.data.name || "未知用户";
      this.points = res.data.data.Points || res.data.data.points || 0;
      logger.logInfo(`积分查询成功，用户 ${name} 的积分为 ${this.points}`);
      this.log += `${name}: 当前积分 ${this.points}\n`;
    } else {
      logger.logWarn("积分查询失败，未返回有效数据");
      this.log += `积分查询失败\n`;
    }
  }

  getLog() {
    return this.log;
  }
}

module.exports = async function (config) {
  const tokens = process.env.YUNYU_TOKEN || config.yunyu.token || "";

  const tokenList = Array.isArray(tokens)
    ? tokens
    : tokens
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

  if (tokenList.length === 0) {
    logger.logError("❌ 未提供有效的 YUNYU_TOKEN");
    return "❌ 未提供有效的 YUNYU_TOKEN";
  }

  let aggregatedLog = [];

  for (const token of tokenList) {
    try {
      const ry = new RainYun(token);
      await ry.signin();
      await ry.query();

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

  return result || "【雨云】：无任务执行结果";
};
