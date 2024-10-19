const axios = require("axios");

let result = "【泡芙加速器】：";

class PFJS {
  constructor(config) {
    this.host = "https://api-admin-js.3dmjiasu.com/";
    this.token = process.env.PFJSQ_TOKEN || config.pfjsq.token;

    // Token 检查逻辑
    if (!this.token) {
      throw new Error("Token 未设置！请在环境变量或配置中提供有效的 token。");
    }

    this.headers = {
      Host: "api-admin-js.3dmjiasu.com",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; M2012K11AC Build/SKQ1.220303.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.141 Mobile Safari/537.36 XWEB/5169 MMWEBSDK/20221011 MMWEBID/6242 MicroMessenger/8.0.30.2260(0x28001E3B) WeChat/arm64 Weixin NetType/WIFI Language/zh_CN ABI/arm64 MiniProgramEnv/android",
      tokentype: "applet",
      "Content-Type": "application/json",
      token: this.token, // 设置 token
    };

    this.count = 0;
    this.body = '{"res_type":1}'; // 请求体默认值
  }

  // 通用请求方法
  async makeRequest(url, method = "post", data = null) {
    try {
      const res = await axios({
        url: `${this.host}${url}`,
        method,
        headers: this.headers,
        data: data || this.body, // 默认使用 body
      });
      return res.data;
    } catch (error) {
      const errorMessage = error.response?.data?.info || error.message;
      console.error(`请求失败：${errorMessage}`);
      return { success: false, message: errorMessage };
    }
  }

  // 处理任务结果
  handleTaskResult(taskName, res) {
    const message = res.info || res.message;
    result += `${taskName}${message} ||`;
    console.log(`${taskName}: ${message}`);
    return message;
  }

  // 签到
  async sign() {
    const res = await this.makeRequest(
      "client/api/v1/virtual_currency/sign_in_for_species"
    );
    this.handleTaskResult("签到", res);
    if (res.info) {
      await this.checkGold(res.info);
    }
  }

  // 兑换6小时时长卡
  async exchange() {
    const res = await this.makeRequest(
      "client/api/v1/virtual_currency/exchange_by_species",
      "post",
      '{"rule_id":4}'
    );
    this.handleTaskResult("兑换", res);
  }

  // 检查金币是否满5个
  async checkGold(message) {
    if (message.includes("5个金币")) {
      await this.exchange();
    }
  }

  // 查询广告剩余次数
  async getAd() {
    const res = await this.makeRequest(
      "client/api/v1/virtual_currency/look_ad_count",
      "get"
    );
    if (res.data) {
      this.count = res.data.limit_count - res.data.sign_count; // 计算剩余广告次数
      console.log(`广告剩余次数: ${this.count}`);
    }
  }

  // 看广告前置（倍率提升）
  async lookAdForPower() {
    const res = await this.makeRequest(
      "client/api/v1/virtual_currency/look_ad_for_power"
    );
    this.handleTaskResult("广告前置倍率", res);
  }

  // 看广告
  async lookAd() {
    const res = await this.makeRequest(
      "client/api/v1/virtual_currency/look_ad_for_species"
    );
    this.handleTaskResult("看广告", res);
    if (res.info) {
      await this.checkGold(res.info);
    }
  }

  // 执行签到和广告任务
  async run() {
    await this.sign(); // 签到
    await this.getAd(); // 获取广告次数

    for (let i = 0; i < this.count; i++) {
      console.log(`--------------- 第${i + 1}轮广告 ---------------`);
      await this.lookAdForPower(); // 先执行广告前置
      await this.lookAd(); // 看广告
      await this.sleepRandom(); // 随机延时
    }
  }

  // 等待30-60秒的随机时间
  sleepRandom() {
    const delay = Math.random() * (60000 - 30000) + 30000; // 随机延迟 30-60 秒
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

// 主程序函数，返回结果
module.exports = async function (config) {
  try {
    const pfjs = new PFJS(config); // 使用传入的配置初始化
    await pfjs.run();

    // 删除末尾的 '||'，避免冗余输出
    return result.endsWith("||") ? result.slice(0, -2) : result;
  } catch (error) {
    console.error(`程序运行错误：${error.message}`);
    return `程序运行错误：${error.message}`;
  }
};
