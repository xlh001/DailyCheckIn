const fs = require("fs");
const yaml = require("js-yaml");
const axios = require("axios");
const path = require("path");

// 加载远程配置
async function getRemoteConfig(url) {
  try {
    const response = await axios.get(url);
    const configData = response.data;
    // 检查返回的数据是否包含需要的字段
    if (configData.match(/cbList/)) {
      return yaml.load(configData);
    } else {
      throw new Error("远程配置文件格式不正确");
    }
  } catch (error) {
    console.error("获取远程配置文件失败：", error.message);
    throw new Error("远程配置加载失败");
  }
}

// 验证配置是否有效
function validateConfig(config) {
  if (!config || !config.cbList) {
    throw new Error("配置文件无效，缺少必要字段：cbList");
  }
  return config;
}

// 加载配置
async function loadConfig() {
  let config = null;
  const ycurl = process.env.ycurl;
  const QL = process.env.QL_DIR;

  if (ycurl) {
    console.log("从远程配置文件加载...");
    config = await getRemoteConfig(ycurl);
  } else {
    const localPath = QL
      ? path.resolve(QL, "config/config.yml")
      : path.resolve(__dirname, "../config.yml");
    console.log(`尝试加载配置文件：${localPath}`);

    if (fs.existsSync(localPath)) {
      console.log("从本地配置文件加载...");
      config = yaml.load(fs.readFileSync(localPath, "utf8"));
    } else {
      console.error("未找到本地配置文件，尝试远程加载...");
      throw new Error("未找到本地配置文件，请检查路径或配置远程 URL。");
    }
  }

  return validateConfig(config);
}

module.exports = { loadConfig };
