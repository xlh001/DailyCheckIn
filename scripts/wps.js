const axios = require("axios");
const base64 = require("base64-js");
const { wps_identify } = require("../utils/code");

class Wps {
  constructor(cookie) {
    this.ck = cookie;
    this.defaultHeaders = {
      Cookie: this.ck,
      Origin: "https://vip.wps.cn",
      Referer:
        "https://vip.wps.cn/spa/2021/wps-sign/?position=2020_vip_massing&client_pay_version=202301",
    };
    this.Log = "";
  }

  async request(url, method = "GET", data = null, headers = {}) {
    try {
      const response = await axios({
        url,
        method,
        headers: { ...this.defaultHeaders, ...headers },
        data,
        responseType: method === "POST" ? "arraybuffer" : "json",
      });
      return response.data;
    } catch (error) {
      console.error(`${method} 请求失败: ${error.message}`);
      return null;
    }
  }

  async getReward() {
    const data = await this.request("https://personal-act.wps.cn/wps_clock/v2");
    if (data?.result === "ok") {
      this.Log += "📝签到日志：\n";
      data.data.list.forEach((item, i) => {
        const status = item.status === 1 ? "已领取" : "未领取";
        const reward = JSON.parse(item.ext)[0];
        this.Log += `⌚️第${i + 1}天🎁奖励${reward.hour}小时会员🎊${status}\n`;
      });
    }
  }

  async getUserInfo() {
    const data = await this.request(
      "https://account.wps.cn/p/auth/check",
      "POST"
    );
    if (data?.result === "ok") {
      this.Log += `👤用户信息：${data.nickname}\n`;
      return data.userid;
    }
    this.Log += "👤用户信息：获取失败\n";
    return null;
  }

  async processCaptcha(type = "pc") {
    const userid = await this.getUserInfo();
    if (!userid) return false;

    const url =
      type === "pc"
        ? `https://personal-act.wps.cn/vas_risk_system/v1/captcha/image?service_id=wps_clock&t=${Date.now()}&request_id=wps_clock_${userid}`
        : `https://vip.wps.cn/checkcode/signin/captcha.png?platform=8&encode=0&img_witdh=336&img_height=84.48&v=${Date.now()}`;

    const response = await axios.get(url, {
      headers: { Cookie: this.ck },
      responseType: "arraybuffer",
    });
    const code = await wps_identify(
      type,
      base64.fromByteArray(new Uint8Array(response.data))
    );
    return type === "pc" ? this.submitCheckin(code) : this.submitSpace(code);
  }

  async submitCheckin(code) {
    const payload = new URLSearchParams({
      double: "0",
      v: "11.1.0.10314",
      c: code,
    });
    const data = await this.request(
      "https://personal-act.wps.cn/wps_clock/v2",
      "POST",
      payload,
      {
        "Content-Type": "application/x-www-form-urlencoded",
      }
    );
    return this.handleResponse(data, "今日签到");
  }

  async submitSpace(code) {
    const url = `https://vip.wps.cn/sign/v2?platform=8&captcha_pos=${code}&img_witdh=336&img_height=84.48`;
    const data = await this.request(url, "POST");
    return this.handleResponse(data, "今日空间签到");
  }

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

  async getBalance() {
    const data = await this.request("https://vipapi.wps.cn/wps_clock/v2/user");
    if (data?.result === "ok") {
      const totalHours = Math.floor(data.data.total / 3600);
      const costHours = Math.floor(data.data.cost / 3600);
      this.Log += `🏦已使用：${costHours}小时 (${Math.floor(
        costHours / 24
      )}天)\n`;
      this.Log += `💰剩余：${totalHours}小时 (${Math.floor(
        totalHours / 24
      )}天)\n`;
    }
  }

  getLog() {
    return this.Log;
  }
}

module.exports = async function (config) {
  const tokens = process.env.wps_pc || config.wps.cookie;
  let aggregatedLog = "";

  for (const token of tokens) {
    const wps = new Wps(token);
    for (let attempt = 1; attempt <= 5; attempt++) {
      if (await wps.processCaptcha()) {
        console.log(`第${attempt}次签到成功`);
        break;
      } else {
        console.log(`第${attempt}次签到失败`);
      }
    }

    await wps.getReward();
    await wps.getBalance();
    await wps.processCaptcha("space");

    aggregatedLog += wps.getLog();
  }

  return `【wps_pc】：\n${aggregatedLog || "无签到信息"}`;
};
