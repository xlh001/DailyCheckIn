const fs = require("fs");
const yaml = require("js-yaml");
const axios = require("axios");
const path = require("path");

/**
 * 加载远程配置文件
 * @param {string} url - 配置文件的远程 URL
 * @returns {object} 配置对象
 */
async function getRemoteConfig(url) {
  try {
    const response = await axios.get(url);
    const configData = response.data;

    if (configData.match(/cbList/)) {
      return yaml.load(configData);
    } else {
      throw new Error("远程配置文件格式不正确");
    }
  } catch (error) {
    throw new Error(`获取远程配置文件失败: ${error.message}`);
  }
}

/**
 * 验证配置对象的合法性
 * @param {object} config - 配置对象
 * @returns {object} 验证后的配置
 */
function validateConfig(config) {
  if (!config || !config.cbList) {
    throw new Error("配置文件无效，缺少必要字段：cbList");
  }
  return config;
}

/**
 * 加载配置文件（支持本地和远程加载）
 * @returns {Promise<object>} 配置对象
 */
async function loadConfig() {
  let config = null;
  const ycurl = process.env.ycurl;
  const QL = process.env.QL_DIR;

  if (ycurl) {
    config = await getRemoteConfig(ycurl);
  } else {
    const localPath = QL
      ? path.resolve(QL, "/data/config/config.yml")
      : path.resolve(__dirname, "../config.yml");

    if (fs.existsSync(localPath)) {
      config = yaml.load(fs.readFileSync(localPath, "utf8"));
    } else {
      throw new Error("未找到本地配置文件，请检查路径或配置远程 URL。");
    }
  }

  return validateConfig(config);
}

module.exports = { loadConfig };
