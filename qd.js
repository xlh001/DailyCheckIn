const yargs = require("yargs");
const { loadConfig } = require("./utils/configLoader");
const { sendNotify } = require("./utils/notifier");
const taskExecutor = require("./utils/taskExecutor"); // 任务执行器模块

// 通用函数，用于获取任务列表
const getTaskList = (source, name) => {
  if (source) {
    console.log(`任务列表从 ${name} 获取:`, source);
    return typeof source === "string" ? source.split(/[&,]/) : source;
  }
  return [];
};

// 初始化函数，加载配置文件并确定任务列表
async function init() {
  let config;
  try {
    config = await loadConfig();
  } catch (error) {
    console.error("加载配置文件时发生错误:", error.message || error);
    throw new Error("未加载到配置文件，程序将退出。");
  }

  // 按命令行、环境变量、配置文件优先级获取任务列表
  const argv = yargs.argv;
  const signList =
    (argv._ && argv._.length > 0 && getTaskList(argv._, "命令行")) ||
    getTaskList(process.env.cbList, "环境变量") ||
    getTaskList(config.cbList, "配置文件") ||
    [];

  if (signList.length === 0) {
    console.warn("未找到任何任务列表，将返回空列表");
  } else {
    console.log(`共获取到 ${signList.length} 个任务`);
  }

  return { config, signList };
}

// 主逻辑函数
async function index() {
  try {
    const { config, signList } = await init();

    if (signList.length === 0) {
      console.warn("没有可执行的任务，程序退出");
      return;
    }

    console.log("------------ 开始签到任务 ------------");

    const results = await taskExecutor(signList, config);

    console.log("------------ 签到任务完成 ------------");

    if (config.needPush) {
      const successTasks = results.filter((result) => result.success).length;
      const failureTasks = results.filter((result) => !result.success).length;
      const message = `所有任务已完成，成功: ${successTasks}，失败: ${failureTasks}`;
      await sendNotify("签到盒", message, results);
    }
  } catch (error) {
    console.error("执行签到任务时发生错误:", error.message || error);
  }
}

index();
