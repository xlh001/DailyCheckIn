const axios = require("axios");

async function sendmsg(text, config, isMarkdown = false) {
  if (!config.Push) {
    throw new Error("Push 服务未定义");
  }
  const { qywx, tgpushkey, qmsgkey, sckey, pushplustoken, vocechat } =
    config.Push;

  console.log(text);
  if (sckey) await server(text, sckey);
  if (qmsgkey) await qmsg(text, qmsgkey);
  if (pushplustoken) await pushplus(text, pushplustoken);
  if (qywx.corpsecret) await wx(text, qywx);
  if (tgpushkey.tgbotoken) await tgpush(text, tgpushkey);
  if (vocechat && vocechat.api) await vocechatP(text, vocechat, isMarkdown);
}
// Server酱推送
async function server(msg, sckey) {
  try {
    const url = `https://sctapi.ftqq.com/${sckey}.send`;
    const data = `title=${encodeURI("签到盒每日任务已完成")}&desp=${encodeURI(
      msg.replace(/\n/g, "\n\n")
    )}`;
    const res = await axios.post(url, data);
    console.log(
      res.data.code === 0
        ? "Server酱: 发送成功"
        : `Server酱: 发送失败 - ${res.data.info}`
    );
  } catch (err) {
    console.error("Server酱: 发送接口调用失败", err);
  }
}

// Vocechat推送
async function vocechatP(msg, { api, uid, key }, isMarkdown = false) {
  try {
    const url = `${api}/api/bot/send_to_user/${uid}`;
    const headers = {
      "x-api-key": key,
      "Content-Type": isMarkdown ? "text/markdown" : "text/plain",
    };
    const formattedMsg = msg.replace(/\n/g, "\n\n").replace(/【|】/g, "**");
    const res = await axios.post(url, formattedMsg, { headers });
    console.log(
      res.data ? "Vocechat: 发送成功" : "Vocechat: 发送失败",
      res.data
    );
  } catch (err) {
    console.error("Vocechat: 发送接口调用失败", err);
  }
}

// PushPlus推送
async function pushplus(msg, pushplustoken) {
  try {
    const url = "http://www.pushplus.plus/send";
    const data = {
      token: pushplustoken,
      title: "签到盒每日任务已完成",
      content: msg.replace(/\n/g, "<br>"),
      template: "html",
    };
    const res = await axios.post(url, data, {
      headers: { "Content-Type": "application/json" },
    });
    console.log(
      res.data.code === 200
        ? "PushPlus: 发送成功"
        : `PushPlus: 发送失败 - ${res.data.msg}`
    );
  } catch (err) {
    console.error("PushPlus: 发送接口调用失败", err);
  }
}

// Qmsg推送
async function qmsg(msg, qmsgkey) {
  try {
    const url = `https://qmsg.zendee.cn/send/${qmsgkey}`;
    const res = await axios.post(url, `msg=${encodeURI(msg)}`);
    console.log(
      res.data.success
        ? "Qmsg: 发送成功"
        : `Qmsg: 发送失败 - ${res.data.reason}`
    );
  } catch (err) {
    console.error("Qmsg: 发送接口调用失败", err);
  }
}

// Telegram推送
async function tgpush(msg, { tgbotoken, chatid }) {
  try {
    const url = `https://tg-bot.0x23.cf/bot${tgbotoken}/sendMessage?parse_mode=Markdown&text=${encodeURI(
      msg.replace(/【|】/g, "*")
    )}&chat_id=${chatid}`;
    const res = await axios.get(url);
    console.log(
      res.data.ok ? "Telegram: 发送成功" : "Telegram: 发送失败",
      res.data
    );
  } catch (err) {
    console.error("Telegram: 发送接口调用失败", err);
  }
}

// 企业微信推送
async function wx(msg, { corpsecret, corpid, agentid, mediaid }) {
  try {
    const tokenUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${corpsecret}`;
    const { data: tokenData } = await axios.get(tokenUrl);
    const access_token = tokenData.access_token;

    const message = mediaid
      ? generateMpNews(msg, agentid, mediaid)
      : generateTextMessage(msg, agentid);
    const sendUrl = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${access_token}`;
    const res = await axios.post(sendUrl, message);

    console.log(
      res.data.errcode === 0
        ? "企业微信: 发送成功"
        : `企业微信: 发送失败 - ${res.data.errmsg}`
    );
  } catch (err) {
    console.error("企业微信: 发送接口调用失败", err);
  }
}

// 企业微信文本消息生成器
function generateTextMessage(content, agentid) {
  return {
    touser: "@all",
    msgtype: "text",
    agentid: agentid || 1000002,
    text: { content },
    safe: 0,
  };
}

// 企业微信图文消息生成器
function generateMpNews(content, agentid, mediaid) {
  return {
    touser: "@all",
    msgtype: "mpnews",
    agentid: agentid || 1000002,
    mpnews: {
      articles: [
        {
          title: "签到盒每日任务已完成",
          thumb_media_id: mediaid || "",
          author: "wenmoux",
          content_source_url: "",
          content: content.replace(/\n/g, "<br>"),
          digest: content,
        },
      ],
    },
    safe: 0,
  };
}

module.exports = { sendmsg };
