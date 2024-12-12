const axios = require("axios");

let result = "【云雨】：\n";

class RainYun {
  constructor(token) {
    this.token = token;
    this.signinResult = false;
    this.points = null;
    this.log = ""; // 改为小写以保持一致性

    this.urls = {
      signin: "https://api.v2.rainyun.com/user/reward/tasks",
      logout: "https://api.v2.rainyun.com/user/logout",
      query: "https://api.v2.rainyun.com/user/",
    };

    this.session = axios.create({
      headers: {
        "x-api-key": this.token,
        "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
        "Content-Type": "application/json",
      },
    });
  }

  async request(method, url, data = {}) {
    try {
      const res = await this.session({ method, url, data });
      if (res.status === 200) return res;
      console.error(`请求失败: ${method.toUpperCase()} ${url}`);
    } catch (error) {
      console.error(`请求出错: ${method.toUpperCase()} ${url}`, error.message);
    }
    return null;
  }

  async signin() {
    const data = JSON.stringify({ task_name: "每日签到" });
    const res = await this.request("post", this.urls.signin, data);
    if (res) {
      this.signinResult = true;
      console.log("成功签到并领取积分");
    } else {
      console.log("签到失败");
    }
  }

  async query() {
    const res = await this.request("get", this.urls.query);
    if (res) {
      this.points = res.data.data.Points || res.data.data.points;
      const name = res.data.data.Name || res.data.data.name;
      console.log("积分查询成功，积分为", this.points);
      this.log += `${name}: 当前积分 ${this.points}\n`;
    } else {
      console.log("积分查询失败");
    }
  }

  getLog() {
    return this.log; // 返回日志变量
  }
}

module.exports = async function (config) {
  const tokens = process.env.YUNYU_TOKEN || config.yunyu.token || "";

  if (!tokens) {
    console.error("❌未添加 YUNYU_TOKEN 变量");
    return;
  }

  let aggregatedLog = ""; // 用于聚合所有token的日志

  for (const token of tokens) {
    try {
      const ry = new RainYun(token);
      await ry.signin();
      await ry.query();

      // 获取并聚合日志
      aggregatedLog += ry.getLog();
    } catch (error) {
      // 捕获并处理错误
      console.log(`出错了！详细错误👇错误token👉${token}`);
      console.error(`程序运行错误：${error.message}`);
      return `程序运行错误：${error.message}`;
    }
  }
  // 返回聚合的结果
  return result + (aggregatedLog ? aggregatedLog : "无积分信息");
};
