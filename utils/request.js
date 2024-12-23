const axios = require("axios");
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
  const details = {
    status: error.response?.status || null,
    data: safeStringify(error.response?.data || null),
    headers: error.response?.headers || null,
    config: error.config,
    message: error.message,
    requestParams: {
      method,
      url,
      data: safeStringify(error.config?.data || null),
    },
  };

  if (error.code === "ECONNABORTED") {
    details.message = `请求超时: ${error.message}`;
  } else if (!error.response) {
    details.message = `未收到服务器响应: ${error.message}`;
  }

  return details;
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
          JSON.stringify({
            level: "warn",
            message: `请求成功，但返回错误代码 3001`,
            method,
            url,
          })
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
      logWarn(
        JSON.stringify({
          level: "warn",
          message: "请求格式错误，错误码 400",
          method,
          url,
        })
      );
      return {
        success: false,
        status,
        message: "请求格式错误，错误码 400",
        data: null,
      };
    case 401:
      logWarn(
        JSON.stringify({
          level: "warn",
          message: "未授权，错误码 401",
          method,
          url,
        })
      );
      return {
        success: false,
        status,
        message: "未授权，错误码 401，请检查 API token",
        data: null,
      };
    case 403:
      logWarn(
        JSON.stringify({
          level: "warn",
          message: "权限不足，错误码 403",
          method,
          url,
        })
      );
      return {
        success: false,
        status,
        message: "权限不足，错误码 403",
        data: null,
      };
    case 404:
      logWarn(
        JSON.stringify({
          level: "warn",
          message: "资源未找到，错误码 404",
          method,
          url,
        })
      );
      return {
        success: false,
        status,
        message: "资源未找到，错误码 404",
        data: null,
      };
    case 500:
      logWarn(
        JSON.stringify({
          level: "warn",
          message: "服务器内部错误，错误码 500",
          method,
          url,
        })
      );
      return {
        success: false,
        status,
        message: "服务器内部错误，错误码 500",
        data: null,
      };
    default:
      logWarn(
        JSON.stringify({
          level: "warn",
          message: `未处理的状态码 ${status}`,
          method,
          url,
        })
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
 * @param {Object} [config={}] 配置参数 (如 maxRetries, retryDelay, timeout, retryableStatusCodes)
 * @returns {Object} 请求结果，包括 success, status, data 等
 */
async function request(session, method, url, data = {}, config = {}) {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    timeout = 5000,
    retryableStatusCodes = [408, 500, 502, 503, 504],
    responseType = "json", // 默认 responseType
  } = config;
  let retries = 0;
  const axiosInstance = session || axios.create();

  while (retries <= maxRetries) {
    try {
      const res = await axiosInstance({ method, url, data, timeout ,responseType});
      return handleResponseStatus(res, method, url);
    } catch (error) {
      const errorDetails = extractErrorDetails(error, method, url);
      const retryMessage = retries < maxRetries ? "将进行重试" : "不再重试";

      logError(
        JSON.stringify({
          level: "error",
          message: `请求错误`,
          details: errorDetails,
          retryMessage,
        })
      );

      if (error.code === "ECONNABORTED" || retryableStatusCodes.includes(error.response?.status)) {
        retries++;
        if (retries <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          continue;
        }
      }

      return {
        success: false,
        status: errorDetails.status,
        message: errorDetails.message,
        data: null,
        requestDetails: errorDetails.requestParams,
      };
    }
  }

  logError(
    JSON.stringify({
      level: "error",
      message: `请求失败: 已达最大重试次数 (${maxRetries})`,
      method,
      url,
    })
  );

  return {
    success: false,
    status: null,
    message: `请求失败: ${method.toUpperCase()} ${url}`,
    data: null,
  };
}

module.exports = { request };
