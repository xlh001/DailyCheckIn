const fs = require("fs");
const path = require("path");

// 定义 scripts 文件夹路径
const scriptsDir = path.join(__dirname, "scripts");

// 读取 scripts 文件夹中的文件列表
fs.readdir(scriptsDir, (err, files) => {
  if (err) {
    console.error(`读取 ${scriptsDir} 目录出错:`, err);
    return;
  }

  // 筛选出以 .js 结尾的文件
  const scriptFiles = files.filter((file) => file.endsWith(".js"));

  // 获取每个脚本的详细信息（名称、任务名称、创建时间、修改时间）
  const scriptDetails = scriptFiles.map((file) => {
    const filePath = path.join(scriptsDir, file);
    const stats = fs.statSync(filePath);

    return {
      name: file, // 文件名
      task: extractTaskNameFromFile(filePath), // 从文件内容中提取任务名称
      createdAt: stats.birthtime, // 创建时间
      updatedAt: stats.mtime, // 更新时间
    };
  });

  // 构造 README.md 文件内容，使用 Markdown 表格格式
  const readmeContent = `
# 项目脚本列表

以下是 \`scripts\` 文件夹中的所有脚本文件：

| 脚本名称        | 任务名称        | 创建时间               | 更新时间               |
| --------------- | --------------- | ---------------------- | ---------------------- |
${scriptDetails
  .map(
    (detail) =>
      `| ${detail.name} | ${detail.task || "未找到任务名称"} | ${formatDate(
        detail.createdAt
      )} | ${formatDate(detail.updatedAt)} |`
  )
  .join("\n")}

更新时间：${new Date().toLocaleString()}
`;

  // 将内容写入 README.md
  fs.writeFile("README.md", readmeContent, (err) => {
    if (err) {
      console.error("写入 README.md 失败:", err);
    } else {
      console.log("README.md 更新成功！");
    }
  });
});

// 从脚本内容中提取任务名称
function extractTaskNameFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const resultLine = content
      .split("\n")
      .find((line) => line.includes("let result ="));

    if (resultLine) {
      // 提取等号右侧的部分作为任务名称，并移除多余空格或符号
      const taskName = resultLine.split("=")[1].trim().replace(/;$/, "");
      return taskName;
    } else {
      return null; // 未找到任务名称
    }
  } catch (error) {
    console.error(`读取文件 ${filePath} 时出错:`, error);
    return null;
  }
}

// 格式化日期为 YYYY-MM-DD HH:MM:SS
function formatDate(date) {
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(
    date.getDate()
  )} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(
    date.getSeconds()
  )}`;
}

// 补零函数，确保个位数前面补零
function padZero(num) {
  return num < 10 ? "0" : "" + num;
}
