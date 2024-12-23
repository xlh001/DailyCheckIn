const { request } = require("./request");

/**
 * 识别 WPS 验证码函数，根据模式（mo）和验证码图片数据（code）
 * @param {String} mo 识别模式
 * @param {String} code 验证码图片数据
 * @returns {Promise<String|null>} 编码后的结果或 null
 */
async function wps_identify(mo, code) {
  // 校验 mo 是否是有效的模式
  if (!mo || typeof mo !== "string" || !/^\w+$/.test(mo)) {
    console.error("无效的模式参数！");
    return null;
  }

  // 根据模式构建 URL
  const url = `https://wsp.xlh001.xyz/inference_wps_${mo}`;

  // 请求头设置
  const headers = {
    "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
    "Content-Type": "text/plain",
  };

  try {
    // 使用封装的 request 函数发送 POST 请求
    const response = await request(null, "POST", url, code, {
      headers,
    });

    // 检查请求是否成功
    if (
      response.success &&
      response.data &&
      Array.isArray(response.data.midpoints)
    ) {
      const result = response.data.midpoints
        .map((arr) => arr.join(","))
        .join("|");
      console.log(result);
      return encodeURIComponent(result);
    } else {
      console.error("返回数据不包含 midpoints 字段");
      return null;
    }
  } catch (error) {
    // 处理请求错误
    console.error(`请求发生错误: ${error.message}`);
    return null;
  }
}

module.exports = { wps_identify };
