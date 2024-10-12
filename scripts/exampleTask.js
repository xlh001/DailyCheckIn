const axios = require("axios");

let result = "【模板】：";

module.exports = async function (config) {
  // 使用配置执行任务
  console.log("执行任务，使用配置: ", config);

  // 模拟任务执行逻辑
  const taskResult = `任务 ${config.taskName || "默认任务"} 执行成功`;
  return taskResult;
};
