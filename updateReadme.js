const fs = require("fs").promises;
const path = require("path");

// 定义 scripts 文件夹路径
const scriptsDir = path.join(__dirname, "scripts");

// 主函数：生成 README.md
async function generateReadme() {
  try {
    // 读取目录并筛选出 .js 文件
    const files = await fs.readdir(scriptsDir);
    const scriptFiles = files.filter((file) => file.endsWith(".js"));

    // 并行处理获取每个文件的详细信息
    const scriptDetails = await Promise.all(
      scriptFiles.map((file) => getFileDetails(file))
    );

    // 生成 README 文件内容
    const readmeContent = createReadmeContent(scriptDetails);

    // 写入 README.md 文件
    await fs.writeFile("README.md", readmeContent, "utf-8");
    console.log("README.md 更新成功！");
  } catch (err) {
    logError("生成 README 文件时出错", err);
  }
}

// 获取文件详细信息
async function getFileDetails(file) {
  const filePath = path.join(scriptsDir, file);
  try {
    const stats = await fs.stat(filePath);
    const taskName = await extractTaskNameFromFile(filePath);
    return {
      name: file,
      task: taskName || "未找到任务名称",
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
    };
  } catch (err) {
    logError(`获取文件信息时出错：${file}`, err);
    return null; // 返回 null 以便过滤掉出错的文件
  }
}

// 从脚本中提取任务名称
async function extractTaskNameFromFile(filePath) {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const resultLine = content.split("\n").find((line) => line.includes("let result ="));
    if (resultLine) {
      const rawValue = resultLine.split("=")[1].trim().replace(/;$/, "").replace(/^["']|["']$/g, "");
      const taskNameMatch = rawValue.match(/【(.*?)】/);
      return taskNameMatch ? taskNameMatch[1] : rawValue;
    }
    return null; // 未找到任务名称
  } catch (error) {
    logError(`读取文件时出错：${filePath}`, error);
    return null;
  }
}

// 创建 README 文件内容
function createReadmeContent(scriptDetails) {
  const tableRows = scriptDetails
    .filter((detail) => detail !== null) // 过滤掉无法读取的文件
    .map(
      (detail) =>
        `| ${detail.name} | ${detail.task} | ${formatDate(detail.createdAt)} | ${formatDate(detail.updatedAt)} |`
    )
    .join("\n");

  return `
# 项目脚本列表

以下是 \`scripts\` 文件夹中的所有脚本文件：

| 脚本名称        | 任务名称        | 创建时间               | 更新时间               |
| --------------- | --------------- | ---------------------- | ---------------------- |
${tableRows}

更新时间：${formatDate(new Date())}
  `;
}

// 格式化日期为 YYYY-MM-DD HH:MM:SS
function formatDate(date) {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(
    date.getHours()
  )}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
}

// 补零函数，确保个位数前面补零
function padZero(num) {
  return num < 10 ? "0" + num : num;
}

// 错误日志记录
function logError(message, error) {
  console.error(`${message}:`, error);
  // 可以将错误写入日志文件，而不是仅仅输出到控制台
  // fs.appendFile("error.log", `${new Date().toISOString()} - ${message}: ${error.stack}\n`);
}

// 执行生成 README.md 的函数
generateReadme();
