const axios = require("axios");
const { logInfo, logWarn, logError } = require("../utils/logger");
const { request } = require("../utils/request");

class RainYun {
  constructor(token) {
    this.token = token.trim();
    this.signinResult = false;
    this.points = null;
    this.log = []; // 使用数组来存储日志

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

  async handleRequest(method, url, data = null) {
    const res = await request(this.session, method, url, data);
    if (res.success) {
      logInfo(`${method.toUpperCase()} 请求成功: ${url}`);
      return res.data;
    } else {
      logWarn(
        `${method.toUpperCase()} 请求失败: ${url}, 错误详情: ${res.error}`
      );
      return null;
    }
  }

  async addToLog(message) {
    this.log.push(message); // 将日志添加到数组中
  }

  async signin() {
    try {
      const data = JSON.stringify({ task_name: "每日签到" });
      const result = await this.handleRequest("post", this.urls.signin, data);
      if (result) {
        this.signinResult = true;
        await this.addToLog("签到成功");
      } else {
        await this.addToLog("签到失败");
      }
    } catch (error) {
      logError("签到失败", error);
      await this.addToLog("签到失败");
    }
  }

  async query() {
    try {
      const result = await this.handleRequest("get", this.urls.query);
      if (result && result.data) {
        const name = result.data.Name || result.data.name || "未知用户";
        this.points = result.data.Points || result.data.points || 0;
        await this.addToLog(`${name}: 当前积分 ${this.points}`);
      } else {
        await this.addToLog("积分查询失败");
      }
    } catch (error) {
      logError("积分查询失败", error);
      await this.addToLog("积分查询失败");
    }
  }

  getLog() {
    return this.log.join("\n");
  }
}

module.exports = async function (config) {
  const envTokens = process.env.YUYUN_token
    ? process.env.YUYUN_token.split("&")
    : [];
  const configTokens = config.yuyun.token ? config.yuyun.token : [];
  const tokens = [...new Set([...envTokens, ...configTokens])];

  if (tokens.length === 0) {
    logError("❌ 未提供有效的 YUNYU_TOKEN");
    return "❌ 未提供有效的 YUNYU_TOKEN";
  }

  const tasks = tokens.map(async (token) => {
    const ry = new RainYun(token);
    await ry.signin();
    await ry.query();
    return ry.getLog();
  });

  const results = await Promise.allSettled(tasks);
  return (
    results
      .map((result) =>
        result.status === "fulfilled"
          ? result.value
          : `任务失败，原因: ${
              result.reason?.message || result.reason || "未知错误"
            }`
      )
      .join("\n") || "【雨云】：无任务执行结果"
  );
};
