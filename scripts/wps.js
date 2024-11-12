const axios = require("axios");
const base64 = require("base64-js");
const { identify } = require("../utils/code");

let result = "【wps_pc】：\n";

class Wps {
  constructor(cookie) {
    this.Position = ["38%2C43", "105%2C50", "174%2C30", "245%2C50", "314%2C34"];
    this.ck = cookie;
    this.Log = "";
    this.defaultHeaders = {
      Cookie: this.ck,
      Origin: "https://vip.wps.cn",
      Referer: "https://vip.wps.cn/spa/2021/wps-sign/?position=2020_vip_massing&client_pay_version=202301",
    };
  }

  // 通用请求方法
  async request(url, method = "GET", data = null, headers = {}) {
    try {
      const response = await axios({
        url,
        method,
        headers: { ...this.defaultHeaders, ...headers },
        data,
        responseType: method === "GET" ? "json" : "arraybuffer",
      });
      return response.data;
    } catch (error) {
      console.error(`${method} 请求失败: ${error.message}`);
      return null;
    }
  }

  // 获取奖励信息
  async getReward() {
    const url = "https://personal-act.wps.cn/wps_clock/v2";
    const data = await this.request(url);
    if (data && data.result === "ok") {
      this.Log += "📝签到日志：\n";
      data.data.list.forEach((item, i) => {
        const status = item.status === 1 ? "已领取" : "未领取";
        const reward = JSON.parse(item.ext)[0];
        this.Log += `⌚️第${i + 1}天🎁奖励${reward.hour}小时会员🎊${status}\n`;
      });
    }
  }

  // 获取用户信息
  async getUserInfo() {
    const url = "https://account.wps.cn/p/auth/check";
    const data = await this.request(url, "POST");
    if (data && data.result === "ok") {
      this.Log += `👤用户信息：${data.nickname}\n`;
      return data.userid;
    }
    this.Log += "👤用户信息：获取失败\n";
    return null;
  }

  // 验证码处理和提交
  async processCaptcha(type = "pc") {
    const userid = await this.getUserInfo();
    if (!userid) return false;

    const url = type === "pc" 
      ? `https://personal-act.wps.cn/vas_risk_system/v1/captcha/image?service_id=wps_clock&t=${Date.now()}&request_id=wps_clock_${userid}`
      : `https://vip.wps.cn/checkcode/signin/captcha.png?platform=8&encode=0&img_witdh=336&img_height=84.48&v=${Date.now()}`;

    try {
      const response = await axios.get(url, {
        headers: { Cookie: this.ck },
        responseType: "arraybuffer",
      });
      const code = await identify(type, base64.fromByteArray(response.data));
      return type === "pc" ? this.submitCheckin(code) : this.submitSpace(code);
    } catch (error) {
      console.error(`${type === "pc" ? "签到" : "空间"}验证码处理失败:`, error.message);
      return false;
    }
  }

  // 提交签到
  async submitCheckin(code) {
    const url = "https://personal-act.wps.cn/wps_clock/v2";
    const payload = new URLSearchParams({ double: "0", v: "11.1.0.10314", c: code });
    const data = await this.request(url, "POST", payload, { "Content-Type": "application/x-www-form-urlencoded" });
    return this.handleResponse(data, "今日签到");
  }

  // 提交空间签到
  async submitSpace(code) {
    const url = `https://vip.wps.cn/sign/v2?platform=8&captcha_pos=${code}&img_witdh=336&img_height=84.48`;
    const data = await this.request(url, "POST");
    return this.handleResponse(data, "今日空间签到");
  }

  // 统一处理响应结果
  handleResponse(data, action) {
    if (data?.msg === "ClockAgent") {
      this.Log += "🙅你今日已经签到过了！\n";
      return true;
    }
    if (data?.result === "ok") {
      this.Log += `🎉${action}成功，获得${data.data.member.hour}小时会员\n`;
      return true;
    }
    this.Log += `🥀${action}失败，${data?.msg || "未知错误"}\n`;
    return false;
  }

  // 获取余额
  async getBalance() {
    const url = "https://vipapi.wps.cn/wps_clock/v2/user";
    const data = await this.request(url);
    if (data && data.result === "ok") {
      const totalHours = Math.floor(data.data.total / 3600);
      const costHours = Math.floor(data.data.cost / 3600);
      this.Log += `🏦已使用：${costHours}小时 (${Math.floor(costHours / 24)}天)\n`;
      this.Log += `💰剩余：${totalHours}小时 (${Math.floor(totalHours / 24)}天)\n`;
    }
  }

  // 获取日志
  getLog() {
    return this.Log;
  }
}

// 主程序函数，返回结果
module.exports = async function (config) {
  const tokens = process.env.WPS_TOKEN || config.wps.cookie;
  let aggregatedLog = ""; // 用于聚合所有token的日志
  for (const token of tokens) {
    const wps = new Wps(token);

    // 尝试签到（5次重试）
    for (let attempt = 1; attempt <= 5; attempt++) {
      const success = await wps.processCaptcha();
      if (success) {
        console.log(`第${attempt}次签到成功`);
        break;
      } else {
        console.log(`第${attempt}次签到失败`);
      }
    }

    // 获取奖励信息和余额
    await wps.getReward();
    await wps.getBalance();

    // 空间签到
    await wps.processCaptcha("space");

    aggregatedLog += wps.getLog();
  }

  return result + (aggregatedLog || "无签到信息");
};
