// 模块化优化后的任务签到系统
const yargs = require("yargs");
const { loadConfig } = require("./utils/configLoader");
const { sendNotify } = require("./utils/notifier");
const taskExecutor = require("./utils/taskExecutor");
const { logInfo, logError, logWarn } = require("./utils/logger");

/**
 * 通用函数，用于获取任务列表
 * @param {string|array} source - 任务列表的来源
 * @param {string} name - 来源名称
 * @returns {array} 任务列表
 */
function getTaskList(source, name) {
  if (source) {
    console.log(`任务列表从 ${name} 获取:`, source);
    return typeof source === "string" ? source.split(/[&,]/) : source;
  }
  return [];
}

/**
 * 获取任务列表
 * @param {object} argv - 命令行参数对象
 * @param {object} config - 配置对象
 * @returns {array} 任务列表
 */
function resolveSignList(argv, config) {
  // 按优先级逐步获取任务列表
  if (argv._ && argv._.length > 0) {
    return getTaskList(argv._, "命令行");
  }
  if (process.env.cbList) {
    return getTaskList(process.env.cbList, "环境变量");
  }
  if (config?.cbList) {
    return getTaskList(config.cbList, "配置文件");
  }
  return []; // 默认返回空列表
}

/**
 * 配置文件加载和任务列表初始化
 * @returns {Promise<{config: object, signList: array}>}
 */
async function init() {
  let config;
  try {
    config = await loadConfig();
    logInfo("配置文件加载成功");
  } catch (error) {
    logError("加载配置文件时发生错误:", error.message || error);
  }

  const argv = yargs.argv;
  const signList = resolveSignList(argv, config);

  if (!config && signList.length === 0) {
    logError("未加载到配置文件且未找到任何任务列表，程序将退出。");
    throw new Error("未加载到配置文件且未找到任何任务列表，程序将退出。");
  }

  return { config, signList };
}

/**
 * 统计任务结果
 * @param {array} results - 任务执行结果
 * @returns {object} 成功和失败任务的数量
 */
function analyzeResults(results) {
  const successTasks = results.filter((result) => result.success).length;
  const failureTasks = results.filter((result) => !result.success).length;
  return { successTasks, failureTasks };
}

/**
 * 发送任务结果通知
 * @param {object} config - 配置信息
 * @param {array} results - 任务执行结果
 */
async function notifyResults(config, results) {
  const { successTasks, failureTasks } = analyzeResults(results);
  const message = `所有任务已完成，成功: ${successTasks}，失败: ${failureTasks}`;
  await sendNotify("签到", message);
}

/**
 * 主逻辑函数
 */
async function main() {
  try {
    const { config, signList } = await init();

    if (signList.length === 0) {
      logWarn("没有可执行的任务，程序退出");
      return;
    }

    logInfo("------------ 开始签到任务 ------------");

    const results = await taskExecutor(signList, config);

    logInfo("------------ 签到任务完成 ------------");

    await notifyResults(config, results);
  } catch (error) {
    logError("执行签到任务时发生错误:", error.message || error);
  }
}

// 启动程序
main();
