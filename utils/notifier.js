const axios = require("axios");

async function sendNotify(title, message, results) {
  const config = process.env.PUSH_CONFIG
    ? JSON.parse(process.env.PUSH_CONFIG)
    : {};
  if (!config.Push || !config.Push.enabled) {
    console.warn("未启用推送服务");
    return;
  }

  try {
    if (config.Push.sckey) await serverNotify(message, config.Push.sckey);
    if (config.Push.tgpushkey)
      await tgpushNotify(message, config.Push.tgpushkey);
    // 其他推送服务类似
    console.log(`${title}: 推送通知已发送`);
  } catch (error) {
    console.error("推送通知发送失败", error);
  }
}

// 发送 Server 酱通知
async function serverNotify(msg, sckey) {
  const url = `https://sctapi.ftqq.com/${sckey}.send`;
  const data = `title=${encodeURIComponent(
    "签到任务完成"
  )}&desp=${encodeURIComponent(msg.replace(/\n/g, "\n\n"))}`;
  try {
    const res = await axios.post(url, data);
    console.log(
      res.data.code === 0 ? "Server酱: 发送成功" : `Server酱: 发送失败`
    );
  } catch (err) {
    console.error("Server酱: 发送失败", err);
  }
}

// Telegram 推送通知
async function tgpushNotify(msg, { tgbotoken, chatid }) {
  const url = `https://api.telegram.org/bot${tgbotoken}/sendMessage?text=${encodeURIComponent(
    msg
  )}&chat_id=${chatid}`;
  try {
    const res = await axios.get(url);
    console.log(res.data.ok ? "Telegram: 发送成功" : "Telegram: 发送失败");
  } catch (err) {
    console.error("Telegram: 发送失败", err);
  }
}

module.exports = { sendNotify };
