const axios = require("axios");
const base64 = require("base64-js");
const { identify } = require("../utils/code");

let result = "【wps_pc】：";

class Wps {
  constructor(cookie) {
    this.Position = ["38%2C43", "105%2C50", "174%2C30", "245%2C50", "314%2C34"];
    this.ck = cookie;
    this.Referer =
      "https://vip.wps.cn/spa/2021/wps-sign/?position=2020_vip_massing&client_pay_version=202301";
    this.Origin = "https://vip.wps.cn";
    this.Log = "";
    this.defaultHeaders = {
      Cookie: this.ck,
      Origin: this.Origin,
      Referer: this.Referer,
    };
  }

  // 通用的 GET 请求方法
  async getRequest(url, headers = {}) {
    try {
      const response = await axios.get(url, {
        headers: { ...this.defaultHeaders, ...headers },
      });
      return response.data;
    } catch (error) {
      console.error(`GET 请求失败: ${error.message}`);
      return null;
    }
  }

  // 通用的 POST 请求方法
  async postRequest(url, data = {}, headers = {}) {
    try {
      const response = await axios.post(url, data, {
        headers: { ...this.defaultHeaders, ...headers },
      });
      return response.data;
    } catch (error) {
      console.error(`POST 请求失败: ${error.message}`);
      return null;
    }
  }

  // 获取奖励信息
  async getReward() {
    const url = "https://personal-act.wps.cn/wps_clock/v2";
    const data = await this.getRequest(url);
    if (data && data.result === "ok") {
      this.logRewards(data.data.list);
    }
  }

  // 打印奖励日志
  logRewards(rewardList) {
    this.Log += "📝签到日志：\n";
    rewardList.forEach((element, i) => {
      const status = element.status === 1 ? "已领取" : "未领取";
      const reward = JSON.parse(element.ext)[0];
      this.Log += `⌚️第${i + 1}天🎁奖励${reward.hour}小时会员🎊${status}\n`;
    });
  }

  // 获取用户信息
  async getCheck() {
    const url = "https://account.wps.cn/p/auth/check";
    const data = await this.postRequest(url);
    if (data && data.result === "ok") {
      this.Log += `👤用户信息：${data.nickname}\n`;
      return data.userid;
    }
    this.Log += "👤用户信息：获取失败\n";
    return "";
  }

  // 获取时间戳
  getTime() {
    return Date.now();
  }

  // 处理验证码
  async codeProcessing() {
    const userid = await this.getCheck();
    if (!userid) return false;

    const url = `https://personal-act.wps.cn/vas_risk_system/v1/captcha/image?service_id=wps_clock&t=${this.getTime()}&request_id=wps_clock_${userid}`;
    try {
      const response = await axios.get(url, {
        headers: { Cookie: this.ck },
        responseType: "arraybuffer",
      });
      const imageBase64 = base64.fromByteArray(response.data);
      const code = await identify("pc", imageBase64);
      return await this.submitCode(code);
    } catch (error) {
      console.error("验证码处理失败:", error.message);
      return false;
    }
  }

  // 提交验证码
  async submitCode(c) {
    const url = "https://personal-act.wps.cn/wps_clock/v2";
    // const payload = { double: "0", v: "11.1.0.10314", c: c };
    const payload = new URLSearchParams();
    payload.append("double", "0");
    payload.append("v", "11.1.0.10314");
    payload.append("c", c);
    const data = await this.postRequest(url, payload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return this.handleSubmitResponse(data, "今日签到");
  }

  // 统一处理提交结果
  handleSubmitResponse(data, actionDescription) {
    // console.log(data);
    if (data.msg === "ClockAgent") {
      this.Log += "🙅你今日已经签到过了！\n";
      return true;
    }
    if (data && data.result === "ok") {
      this.Log += `🎉${actionDescription}成功，获得${data.data.member.hour}小时会员\n`;
      return true;
    }
    this.Log += `🥀${actionDescription}失败，${data?.msg || "未知错误"}\n`;
    return false;
  }

  // 签到兑换
  async exchange(day) {
    const url = `https://vipapi.wps.cn/wps_clock/v2/exchange?day=${day}`;
    const data = await this.postRequest(url);
    return this.handleSubmitResponse(data, `${day}天会员兑换`);
  }

  // 获取余额
  async getBalance() {
    const url = "https://vipapi.wps.cn/wps_clock/v2/user";
    const data = await this.getRequest(url);
    if (data && data.result === "ok") {
      const total = Math.floor(data.data.total / 3600);
      const cost = Math.floor(data.data.cost / 3600);
      this.Log += `🏦已使用额度：${cost}小时 (${Math.floor(cost / 24)}天)\n`;
      this.Log += `💰剩余额度：${total}小时 (${Math.floor(total / 24)}天)\n`;
    }
  }

  // 空间验证码处理
  async spaceCodeProcessing() {
    const url = `https://vip.wps.cn/checkcode/signin/captcha.png?platform=8&encode=0&img_witdh=336&img_height=84.48&v=${this.getTime()}`;
    try {
      const response = await axios.get(url, {
        headers: { Cookie: this.ck },
        responseType: "arraybuffer",
      });
      const imageBase64 = base64.fromByteArray(response.data);
      const code = await identify("space", imageBase64);
      return await this.submitSpace(code);
    } catch (error) {
      console.error("空间验证码处理失败:", error.message);
      return false;
    }
  }

  // 提交空间验证码
  async submitSpace(c) {
    const url = `https://vip.wps.cn/sign/v2?platform=8&captcha_pos=${c}&img_witdh=336&img_height=84.48`;
    const data = await this.postRequest(url);
    return this.handleSubmitResponse(data, "今日空间签到");
  }

  // 获取日志
  getLog() {
    return this.Log;
  }
}

// 主程序函数，返回结果
module.exports = async function (config) {
  let wps_pc_list = process.env.WPS_TOKEN || config.wps.cookie;
  for (const mt_token of wps_pc_list) {
    try {
      // 创建 wps 对象
      const w = new Wps(mt_token);

      // 尝试签到，最多 5 次
      for (let i = 0; i < 5; i++) {
        const success = await w.codeProcessing(); // 假设 codeProcessing 返回 Promise
        if (success) {
          console.log(`第${i + 1}次尝试签到成功`);
          break;
        } else {
          console.log(`第${i + 1}次尝试签到失败`);
        }
      }

      // 获取奖励信息
      await w.getReward(); // 假设 getReward 是异步方法
      await w.getBalance(); // 假设 getBalance 是异步方法

      // 获取并发送日志
      const log = w.getLog(); // 获取日志
      //   notify.send("WPS_PC", log.replace(/\n/g, "\\n")); // 替换日志中的换行符并发送通知
      return log.endsWith("||") ? log.slice(0, -2) : log;
    } catch (error) {
      // 捕获并处理错误
      console.log(`出错了！详细错误👇错误CK👉${mt_token}`);
      console.error(`程序运行错误：${error.message}`);
      return `程序运行错误：${error.message}`;
    }
  }
};
