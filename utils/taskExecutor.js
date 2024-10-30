const fs = require("fs");
const path = require("path");
const { sendNotify } = require("./notifier");

// 通知发送函数
async function notify(message) {
  try {
    await sendNotify(message);
    console.log(`通知已发送: ${message}`);
  } catch (error) {
    console.error(`发送通知时发生错误: ${error.message}`);
  }
}

// 任务状态记录函数
function logTaskStatus(taskName, status, message) {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] 任务: ${taskName}, 状态: ${status}, 信息: ${message}`
  );
}

// 单个任务执行函数
async function executeTask(taskName, config) {
  const taskPath = path.resolve(__dirname, `../scripts/${taskName}.js`);

  // 检查任务脚本是否存在
  if (!fs.existsSync(taskPath)) {
    const errMsg = `任务 ${taskName} 不存在，请确认脚本文件是否存在。`;
    console.error(errMsg);
    await notify(errMsg);
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
      await notify(result);
    }

    return { taskName, success: true, message: result };
  } catch (error) {
    const errMsg = `${taskName} 任务执行出错: ${error.message}`;
    console.error(errMsg);
    await notify(errMsg);
    return { taskName, success: false, message: errMsg };
  }
}

// 并行执行多个任务
async function executeTasks(taskList, config) {
  const aggregatedResults = []; // 用于聚合任务结果

  try {
    const results = await Promise.allSettled(
      taskList.map((taskName) => executeTask(taskName, config))
    );

    results.forEach(({ status, value, reason }, idx) => {
      const taskName = taskList[idx];
      if (status === "fulfilled") {
        const { success, message } = value;
        logTaskStatus(taskName, success ? "成功" : "失败", message);
        aggregatedResults.push(message); // 聚合结果
      } else {
        logTaskStatus(taskName, "失败", `原因: ${reason.message}`);
        aggregatedResults.push({
          taskName,
          success: false,
          message: reason ? reason.message : "任务执行失败",
        }); // 聚合结果
      }
    });

    // 输出聚合结果日志
    console.log("所有任务执行结果汇总:", aggregatedResults);

    return aggregatedResults; // 返回聚合结果
  } catch (error) {
    const errMsg = `执行任务列表时出错: ${error.message}`;
    console.error(errMsg);
    await sendNotify(errMsg);
    return taskList.map((taskName) => ({
      taskName,
      success: false,
      message: "执行过程中出错",
    }));
  }
}

module.exports = executeTasks;
