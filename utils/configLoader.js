const yaml = require("js-yaml");
const fs = require("fs");
const axios = require("axios");

async function loadConfig() {
  let config = null;
  const ycurl = process.env.ycurl;
  const QL = process.env.QL_DIR;

  if (ycurl) {
    config = await getRemoteConfig(ycurl);
  } else {
    const localPath = QL
      ? `/${QL}/data/config/config.yml`
      : "./config/config.yml";
    if (fs.existsSync(localPath)) {
      config = yaml.load(fs.readFileSync(localPath, "utf8"));
    } else {
      console.error(
        "未找到本地配置文件，请检查路径或配置环境变量 ycurl 以获取远程配置。"
      );
    }
  }

  return config;
}

async function getRemoteConfig(ycurl) {
  try {
    const response = await axios.get(ycurl);
    const configData = response.data;
    if (configData.match(/cbList/)) {
      return yaml.load(configData);
    } else {
      console.error("远程配置文件格式不正确");
      return null; // 添加返回 null
    }
  } catch (error) {
    console.error("获取远程配置文件失败：", error);
  }
  return null;
}

module.exports = { loadConfig };
