const fs = require("fs");
const path = require("path");
const { sendmsg } = require("./sendmsg");

// 通知发送函数
async function notify(message) {
  try {
    await sendmsg(message);
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
  try {
    const results = await Promise.allSettled(
      taskList.map((taskName) => executeTask(taskName, config))
    );

    results.forEach(({ status, value, reason }, idx) => {
      const taskName = taskList[idx];
      if (status === "fulfilled") {
        const { success, message } = value;
        logTaskStatus(taskName, success ? "成功" : "失败", message);
      } else {
        logTaskStatus(taskName, "失败", `原因: ${reason.message}`);
      }
    });

    return results.map(({ status, value, reason }, idx) => {
      const taskName = taskList[idx];
      return status === "fulfilled"
        ? { taskName, success: value.success, message: value.message }
        : {
            taskName,
            success: false,
            message: reason ? reason.message : "任务执行失败",
          };
    });
  } catch (error) {
    const errMsg = `执行任务列表时出错: ${error.message}`;
    console.error(errMsg);
    await notify(errMsg);
    return taskList.map((taskName) => ({
      taskName,
      success: false,
      message: "执行过程中出错",
    }));
  }
}

module.exports = executeTasks;
