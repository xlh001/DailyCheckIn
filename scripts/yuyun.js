const axios = require("axios");
const { logInfo, logWarn, logError } = require("../utils/logger");
const { request } = require("../utils/request");

class RainYun {
  /**
   * 构造函数，初始化 RainYun 类实例
   * @param {string} token 用户的 API token
   */
  constructor(token) {
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
        "x-api-key": token,
      },
    });
  }

  /**
   * 将日志消息添加到日志数组
   * @param {string} message 要记录的日志消息
   */
  async addToLog(message) {
    this.log.push(message); // 将日志添加到数组中
  }

  /**
   * 执行每日签到任务
   * @returns {Promise<void>}
   */
  async signin() {
    try {
      const data = JSON.stringify({
        task_name: "每日签到",
      });
      const result = await request(
        this.session,
        "post",
        this.urls.signin,
        data
      );

      if (result.success) {
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

  /**
   * 查询用户的积分任务
   * @returns {Promise<void>}
   */
  async query() {
    try {
      const result = await request(this.session, "get", this.urls.query);
      if (result.success && result.data) {
        const name = result.data.Name || result.data.data.Name || "未知用户";
        this.points = result.data.Points || result.data.data.Points || 0;
        await this.addToLog(`${name}: 当前积分 ${this.points}`);
      } else {
        await this.addToLog("积分查询失败");
      }
    } catch (error) {
      logError("积分查询失败", error);
      await this.addToLog("积分查询失败");
    }
  }

  /**
   * 获取当前类实例的日志
   * @returns {string} 当前所有日志的拼接字符串
   */
  getLog() {
    return this.log.join("\n");
  }
}

/**
 * 处理所有 token 的任务执行
 * @param {Object} config 配置对象，包含 token 配置
 * @returns {Promise<string>} 聚合所有 token 执行结果的日志
 */
module.exports = async function (config) {
  const envTokens = process.env.YUYUN_TOKEN
    ? process.env.YUYUN_TOKEN.split("&")
    : [];
  const configTokens = config.yuyun.token ? config.yuyun.token : [];
  const tokens = [...new Set([...envTokens, ...configTokens])];

  // 如果没有有效的 token，返回错误消息
  if (tokens.length === 0) {
    logError("❌ 未提供有效的 YUNYU_TOKEN");
    return "❌ 未提供有效的 YUNYU_TOKEN";
  }

  const tasks = tokens.map(async (token) => {
    const wps = new RainYun(token);
    await wps.signin();
    await wps.query();
    return wps.getLog(); // 使用 wps.getLog() 返回日志
  });

  const results = await Promise.allSettled(tasks);

  // 返回执行结果日志
  return (
    results
      .map((result) =>
        result.status === "fulfilled" ? result.value : result.reason.log
      )
      .join("\n") || "【雨云】：无任务执行结果"
  ); // 如果没有执行结果，返回默认消息
};
