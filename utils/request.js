const logger = require("./logger");

/**
 * 处理包含循环结构的 JSON 转换
 * @param {Object} obj 需要转换的对象
 * @returns {string} 序列化后的 JSON 字符串
 */
function safeStringify(obj) {
  const seen = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return; // 避免循环引用
      }
      seen.add(value);
    }
    return value;
  });
}

/**
 * 通用请求函数，用于封装 HTTP 请求逻辑
 * @param {Object} session Axios 实例
 * @param {String} method HTTP 方法
 * @param {String} url 请求地址
 * @param {Object} [data={}] 请求数据
 * @param {Number} [maxRetries=3] 最大重试次数
 * @param {Number} [retryDelay=1000] 每次重试的延迟时间（毫秒）
 * @param {Number} [timeout=5000] 请求超时时间（毫秒）
 * @returns {Object} 请求结果，包括 success, status, data 等
 */
async function request(
  session,
  method,
  url,
  data = {},
  maxRetries = 3,
  retryDelay = 1000,
  timeout = 5000 // 设置默认超时时间
) {
  timeout = parseInt(timeout, 10); // 确保 timeout 为整数
  if (isNaN(timeout) || timeout <= 0) {
    timeout = 5000; // 如果无效，回退到默认值
  }

  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const res = await session({
        method,
        url,
        data,
        timeout,
      });

      if (res.status === 200) {
        // logger.logInfo(`请求成功: ${method.toUpperCase()} ${url} - 响应状态: ${res.status}`);
        return {
          success: true,
          status: res.status,
          data: res.data,
        };
      }

      logger.logWarn(`请求失败: ${method.toUpperCase()} ${url} - 状态码: ${res.status}`);
    } catch (error) {
      const errorDetails = extractErrorDetails(error, method, url);

      // 获取错误发生时的堆栈信息
      const stackTrace = error.stack || "无法获取堆栈信息";

      const retryMessage = retries < maxRetries ? "将进行重试" : "不再重试";
      logger.logError(
        `请求错误: ${method.toUpperCase()} ${url} - 错误信息: ${errorDetails.message || "未知错误"}，堆栈: ${stackTrace}, ${retryMessage}`
      );
    }

    retries++;
    if (retries <= maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  logger.logError(`请求失败: 已达最大重试次数 (${maxRetries}) - ${method.toUpperCase()} ${url}`);
  return {
    success: false,
    status: null,
    message: `请求失败: ${method.toUpperCase()} ${url}`,
    data: null,
  };
}

/**
 * 提取错误详细信息
 * @param {Object} error Axios 错误对象
 * @param {String} method HTTP 方法
 * @param {String} url 请求地址
 * @returns {Object} 错误详情
 */
function extractErrorDetails(error, method, url) {
  if (error.response) {
    // 服务器返回响应
    return {
      status: error.response.status,
      data: safeStringify(error.response.data), // 只记录可序列化的数据
      headers: error.response.headers,
      config: error.config,
      message: error.message,
    };
  } else if (error.request) {
    // 请求已发出，但未收到响应
    return {
      status: null,
      data: null,
      message: `未收到服务器响应: ${error.message}`,
      request: error.request,
      config: error.config,
    };
  } else if (error.code === 'ECONNABORTED') {
    // 处理超时错误
    return {
      status: null,
      data: null,
      message: `请求超时: ${error.message}`,
    };
  } else {
    // 其他错误（例如配置错误）
    return {
      status: null,
      data: null,
      message: `请求错误: ${error.message}`,
    };
  }
}

module.exports = { request };
