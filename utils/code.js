const axios = require("axios");

// 识别验证码函数，根据模式（mo）和验证码图片数据（code）
async function identify(mo, code) {
  // 根据模式构建 URL
  const url = `http://cn-hk-bgp-4.ofalias.net:50818/inference_wps_${mo}`;

  // 请求头设置
  const headers = {
    "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
    "Content-Type": "text/plain",
  };

  try {
    // 发送 POST 请求
    const response = await axios.post(url, code, { headers });

    code = response.data.midpoints.map((arr) => arr.join(",")).join("|");
    console.log(code);
    return encodeURIComponent(code);
  } catch (error) {
    // 处理请求错误
    console.error(`请求发生错误: ${error.message}`);
    return null;
  }
}

module.exports = { identify };
