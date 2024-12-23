const axios = require("axios");
const Base64 = require("js-base64");
const { wps_identify } = require("../utils/code");
const { logInfo, logError } = require("../utils/logger");
const { request } = require("../utils/request");

class Wps {
  constructor(cookie) {
    this.session = axios.create({
      headers: {
        Cookie: cookie,
        Origin: "https://vip.wps.cn",
        Referer:
          "https://vip.wps.cn/spa/2021/wps-sign/?position=2020_vip_massing&client_pay_version=202301",
      },
    });
    this.log = [];
  }

  async addToLog(message) {
    this.log.push(message);
  }

  async getReward() {
    try {
      const { data } = await request(
        this.session,
        "GET",
        "https://personal-act.wps.cn/wps_clock/v2"
      );
      if (data?.result === "ok") {
        await this.addToLog("📝 签到日志：");
        data.data.list.forEach(async (item, i) => {
          const status = item.status === 1 ? "已领取" : "未领取";
          const reward = JSON.parse(item.ext)[0];
          await this.addToLog(
            `⌚️ 第${i + 1}天 🎁 奖励 ${reward.hour} 小时会员 🎊 ${status}`
          );
        });
      }
    } catch (error) {
      logError(`获取奖励信息失败: ${error.message}`);
    }
  }

  async getUserInfo() {
    try {
      const { data } = await request(
        this.session,
        "POST",
        "https://account.wps.cn/p/auth/check"
      );
      if (data?.result === "ok") {
        await this.addToLog(`👤 用户信息：${data.nickname}`);
        return data.userid;
      }
      await this.addToLog("👤 用户信息：获取失败");
    } catch (error) {
      logError(`获取用户信息失败: ${error.message}`);
    }
    return null;
  }

  async processCaptcha(type = "pc") {
    const userid = await this.getUserInfo();
    if (!userid) return false;

    const url =
      type === "pc"
        ? `https://personal-act.wps.cn/vas_risk_system/v1/captcha/image?service_id=wps_clock&t=${Date.now()}&request_id=wps_clock_${userid}`
        : `https://vip.wps.cn/checkcode/signin/captcha.png?platform=8&encode=0&img_witdh=336&img_height=84.48&v=${Date.now()}`;

    try {
      const response = await request(
        this.session,
        "GET",
        url,
        {},
        {
          maxRetries: 3,
          retryDelay: 1000,
          timeout: 5000,
          responseType: "arraybuffer",
        }
      );
      const imgarr = new Uint8Array(response.data);
      const base64String = Base64.encode(imgarr);
      const code = await wps_identify(type, base64String);
      return this.submitTask(type, code);
    } catch (error) {
      logError(`获取验证码失败: ${error.message}`);
      return false;
    }
  }

  async submitTask(type, code) {
    const url =
      type === "pc"
        ? "https://personal-act.wps.cn/wps_clock/v2"
        : `https://vip.wps.cn/sign/v2?platform=8&captcha_pos=${code}&img_witdh=336&img_height=84.48`;

    const payload =
      type === "pc"
        ? new URLSearchParams({ double: "0", v: "11.1.0.10314", c: code })
        : null;

    try {
      const data = await request(
        this.session,
        type === "pc" ? "POST" : "POST",
        url,
        payload,
        3,
        1000,
        type === "pc"
          ? { "Content-Type": "application/x-www-form-urlencoded" }
          : {}
      );
      return this.handleResponse(
        data,
        type === "pc" ? "今日签到" : "今日空间签到"
      );
    } catch (error) {
      logError(`提交任务失败 (${type}): ${error.message}`);
      return false;
    }
  }

  handleResponse(data, action) {
    if (data?.msg === "ClockAgent") {
      this.addToLog("🙅 你今日已经签到过了！");
      return true;
    }
    if (data?.result === "ok") {
      this.addToLog(`🎉 ${action}成功，获得 ${data.data.member.hour} 小时会员`);
      return true;
    }
    this.addToLog(`🥀 ${action}失败，${data?.msg || "未知错误"}`);
    return false;
  }

  async getBalance() {
    try {
      const { data } = await request(
        this.session,
        "GET",
        "https://vipapi.wps.cn/wps_clock/v2/user"
      );
      if (data?.result === "ok") {
        const totalHours = Math.floor(data.data.total / 3600);
        const costHours = Math.floor(data.data.cost / 3600);
        await this.addToLog(
          `🏦 已使用：${costHours} 小时 (${Math.floor(costHours / 24)} 天)`
        );
        await this.addToLog(
          `💰 剩余：${totalHours} 小时 (${Math.floor(totalHours / 24)} 天)`
        );
      }
    } catch (error) {
      logError(`获取余额信息失败: ${error.message}`);
    }
  }

  getLog() {
    return this.log.join("\n");
  }
}

module.exports = async function (config) {
  const envTokens = process.env.wps_pc ? process.env.wps_pc.split("&") : [];
  const configTokens = config.wps.cookie ? config.wps.cookie : [];
  const tokens = [...new Set([...envTokens, ...configTokens])];

  if (tokens.length === 0) {
    logError("未提供有效的 token 列表");
    return "【wps_pc】：无任务执行结果";
  }

  const tasks = tokens.map(async (token) => {
    const wps = new Wps(token);
    await wps.processCaptcha();
    await wps.getReward();
    await wps.getBalance();
    await wps.processCaptcha("space");
    return wps.getLog();
  });

  const results = await Promise.allSettled(tasks);
  return (
    results
      .map((result) =>
        result.status === "fulfilled"
          ? result.value
          : `任务失败，原因: ${result.reason || "未知错误"}`
      )
      .join("\n") || "【wps_pc】：无任务执行结果"
  );
};
