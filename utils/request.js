const { logInfo, logError, logWarn } = require("./logger");

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
      data: safeStringify(error.response.data),
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
  } else if (error.code === "ECONNABORTED") {
    return {
      status: null,
      data: null,
      message: `请求超时: ${error.message}`,
    };
  } else {
    return {
      status: null,
      data: null,
      message: `请求错误: ${error.message}`,
    };
  }
}

/**
 * 处理 HTTP 响应的状态码
 * @param {Object} res Axios 响应对象
 * @param {String} method HTTP 方法
 * @param {String} url 请求地址
 * @returns {Object} 统一的响应结构
 */
function handleResponseStatus(res, method, url) {
  const { status, data } = res;

  switch (status) {
    case 200:
      if (data.code === 3001) {
        logWarn(
          `请求成功，但返回错误代码 3001 - ${method.toUpperCase()} ${url}`
        );
        return {
          success: false,
          status,
          message: "认证失败，错误码 3001",
          data: null,
        };
      }
      return { success: true, status, data };
    case 400:
      logWarn(`请求错误 400: 请求格式错误 - ${method.toUpperCase()} ${url}`);
      return {
        success: false,
        status,
        message: "请求格式错误，错误码 400",
        data: null,
      };
    case 401:
      logWarn(`请求错误 401: 未授权 - ${method.toUpperCase()} ${url}`);
      return {
        success: false,
        status,
        message: "未授权，错误码 401，请检查 API token",
        data: null,
      };
    case 403:
      logWarn(`请求错误 403: 权限不足 - ${method.toUpperCase()} ${url}`);
      return {
        success: false,
        status,
        message: "权限不足，错误码 403",
        data: null,
      };
    case 404:
      logWarn(`请求错误 404: 资源未找到 - ${method.toUpperCase()} ${url}`);
      return {
        success: false,
        status,
        message: "资源未找到，错误码 404",
        data: null,
      };
    case 500:
      logWarn(`请求错误 500: 服务器内部错误 - ${method.toUpperCase()} ${url}`);
      return {
        success: false,
        status,
        message: "服务器内部错误，错误码 500",
        data: null,
      };
    default:
      logWarn(
        `请求失败: 未处理的状态码 ${status} - ${method.toUpperCase()} ${url}`
      );
      return {
        success: false,
        status,
        message: `请求失败，未处理的状态码 ${status}`,
        data: null,
      };
  }
}

/**
 * 通用请求函数，用于封装 HTTP 请求逻辑
 * @param {Object} session Axios 实例
 * @param {String} method HTTP 方法
 * @param {String} url 请求地址
 * @param {Object} [data={}] 请求数据
 * @param {Object} [config={}] 配置参数 (如 maxRetries, retryDelay, timeout)
 * @returns {Object} 请求结果，包括 success, status, data 等
 */
async function request(session, method, url, data = {}, config = {}) {
  const { maxRetries = 3, retryDelay = 2000, timeout = 5000 } = config;
  let retries = 0;

  while (retries <= maxRetries) {
    try {
      const res = await session({ method, url, data, timeout });
      return handleResponseStatus(res, method, url);
    } catch (error) {
      const errorDetails = extractErrorDetails(error, method, url);
      const stackTrace = error.stack || "无法获取堆栈信息";
      const retryMessage = retries < maxRetries ? "将进行重试" : "不再重试";

      logError(
        `请求错误: ${method.toUpperCase()} ${url} - 错误信息: ${
          errorDetails.message || "未知错误"
        }，堆栈: ${stackTrace}, ${retryMessage}`
      );

      // 如果是超时错误，可以重试
      if (error.code === "ECONNABORTED") {
        logWarn(`请求超时: ${method.toUpperCase()} ${url}`);
        return {
          success: false,
          status: null,
          message: "请求超时，请稍后重试",
          data: null,
        };
      }

      // 针对其他错误（如 API 错误）不再重试，直接返回
      if (error.response) {
        const statusCode = error.response.status;
        if ([400, 401, 403, 404, 500].includes(statusCode)) {
          logWarn(`请求错误: ${statusCode} - ${method.toUpperCase()} ${url}`);
          return {
            success: false,
            status: statusCode,
            message: `请求错误: ${statusCode}`,
            data: null,
          };
        }
      }
    }

    retries++;
    if (retries <= maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  logError(
    `请求失败: 已达最大重试次数 (${maxRetries}) - ${method.toUpperCase()} ${url}`
  );
  return {
    success: false,
    status: null,
    message: `请求失败: ${method.toUpperCase()} ${url}`,
    data: null,
  };
}

module.exports = { request };
