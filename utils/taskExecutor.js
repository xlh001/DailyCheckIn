const fs = require("fs");
const path = require("path");
const { sendNotify } = require("./notifier");

async function executeTask(taskName, config) {
  const taskPath = path.resolve(__dirname, `../scripts/${taskName}.js`);

  // 检查任务脚本是否存在
  if (!fs.existsSync(taskPath)) {
    const errMsg = `任务 ${taskName} 不存在，请确认脚本文件是否存在。`;
    console.error(errMsg);
    await sendNotify("任务失败", errMsg, []);
    return { taskName, success: false, message: errMsg };
  }

  try {
    const task = require(taskPath);
    if (typeof task !== "function") {
      throw new Error(`任务 ${taskName} 无效，未导出有效的执行函数。`);
    }

    const result = await task(config);
    console.log(`${taskName} 任务执行结果: ${result}`);
    if (result && /cookie|失效|失败/.test(result)) {
      await sendNotify("任务异常", result, []);
    }

    return { taskName, success: true, message: result };
  } catch (error) {
    const errMsg = `${taskName} 任务执行出错: ${error.message}`;
    console.error(errMsg);
    await sendNotify("任务执行失败", errMsg, []);
    return { taskName, success: false, message: errMsg };
  }
}

// 并行执行多个任务，限制并发数
async function executeTasks(taskList, config) {
  const concurrencyLimit = 5; // 限制最大并发数
  const results = [];

  for (let i = 0; i < taskList.length; i++) {
    if (i % concurrencyLimit === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 控制并发间隔
    }

    const taskResult = await executeTask(taskList[i], config);
    results.push(taskResult);
  }

  return results;
}

module.exports = executeTasks;
