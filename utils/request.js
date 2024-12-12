const logger = require("./logger");

/**
 * 通用请求函数，用于封装 HTTP 请求逻辑
 * @param {Object} session Axios 实例
 * @param {String} method HTTP 方法
 * @param {String} url 请求地址
 * @param {Object} [data={}] 请求数据
 * @param {Number} [maxRetries=3] 最大重试次数
 * @param {Number} [retryDelay=1000] 每次重试的延迟时间（毫秒）
 * @returns {Object} 请求结果，包括 success, status, data 等
 */
async function request(
  session,
  method,
  url,
  data = {},
  maxRetries = 3,
  retryDelay = 1000
) {
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const res = await session({
        method,
        url,
        data,
        timeout: 5000, // 设置超时时间
      });

      if (res.status === 200) {
        logger.logInfo(`请求成功: ${method.toUpperCase()} ${url}`);
        return {
          success: true,
          status: res.status,
          data: res.data,
        };
      }

      logger.logWarn(
        `请求失败: ${method.toUpperCase()} ${url} - 状态码: ${
          res.status
        }, 响应: ${JSON.stringify(res.data)}`
      );
    } catch (error) {
      const errorDetails = extractErrorDetails(error, method, url);

      if (
        errorDetails.status >= 400 &&
        errorDetails.status < 500 &&
        errorDetails.status !== 429
      ) {
        logger.logError(
          `请求失败，不重试: ${method.toUpperCase()} ${url} - ${JSON.stringify(
            errorDetails
          )}`
        );
        break;
      }

      logger.logError(
        `请求出错: ${method.toUpperCase()} ${url} - ${JSON.stringify(
          errorDetails
        )}`
      );
    }

    retries++;
    if (retries <= maxRetries) {
      logger.logInfo(`重试 ${retries}/${maxRetries} 次后继续...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  logger.logError(
    `已达最大重试次数 (${maxRetries})，请求失败: ${method.toUpperCase()} ${url}`
  );
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
    return {
      status: error.response.status,
      data: error.response.data,
      headers: error.response.headers,
      config: error.config,
      message: error.message,
    };
  } else if (error.request) {
    return {
      status: null,
      data: null,
      message: `未收到服务器响应: ${error.message}`,
      request: error.request,
      config: error.config,
    };
  } else {
    return {
      status: null,
      data: null,
      message: `请求错误: ${error.message}`,
    };
  }
}

module.exports = { request };
