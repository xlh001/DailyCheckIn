const axios = require("axios");
const logger = require("../utils/logger");

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

  async request(method, url, data = {}, maxRetries = 3, retryDelay = 1000) {
    let retries = 0;

    while (retries <= maxRetries) {
      try {
        const res = await this.session({ method, url, data });
        if (res.status === 200) return res;

        logger.logWarn(
          `请求失败: ${method.toUpperCase()} ${url} - 状态码: ${res.status}`
        );
      } catch (error) {
        logger.logError(
          `请求出错: ${method.toUpperCase()} ${url} - ${error.message}`
        );
      }

      retries++;
      if (retries <= maxRetries) {
        logger.logInfo(`重试 ${retries}/${maxRetries} 次后继续...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    logger.logError(
      `已达最大重试次数 (${maxRetries})，请求失败: ${method.toUpperCase()} ${url}`
    );
    return null;
  }

  async signin() {
    const data = JSON.stringify({ task_name: "每日签到" });
    const res = await this.request("post", this.urls.signin, data);
    if (res) {
      this.signinResult = true;
      logger.logInfo("成功签到并领取积分");
      this.log += `签到成功\n`;
    } else {
      logger.logWarn("签到失败");
      this.log += `签到失败\n`;
    }
  }

  async query() {
    const res = await this.request("get", this.urls.query);
    if (res) {
      this.points = res.data.data.Points || res.data.data.points;
      const name = res.data.data.Name || res.data.data.name;
      logger.logInfo(`积分查询成功，积分为 ${this.points}`);
      this.log += `${name}: 当前积分 ${this.points}\n`;
    } else {
      logger.logWarn("积分查询失败");
      this.log += `积分查询失败\n`;
    }
  }

  getLog() {
    return this.log; // 返回日志变量
  }
}

module.exports = async function (config) {
  const tokens = process.env.YUNYU_TOKEN || config.yunyu.token || "";

  if (!tokens.length) {
    logger.logError("❌ 未添加 YUNYU_TOKEN 变量");
    return "未配置有效的 Token";
  }

  let aggregatedLog = ""; // 用于聚合所有 token 的日志

  await Promise.all(
    tokens.map(async (token) => {
      if (!token.trim()) return;
      try {
        const ry = new RainYun(token);
        await ry.signin();
        await ry.query();
        aggregatedLog += ry.getLog();
      } catch (error) {
        logger.logError(`❌ 处理 token 失败: ${token}`);
        logger.logError(`详细错误信息: ${error.message}`);
      }
    })
  );

  const result =
    "【雨云】：\n" + (aggregatedLog.trim() ? aggregatedLog : "无积分信息");
  return result;
};
