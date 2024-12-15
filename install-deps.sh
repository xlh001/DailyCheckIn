#!/bin/bash

# 脚本名称: install-deps.sh
# 功能: 自动检测 yarn、pnpm、npm 并按优先级安装依赖，如未找到则自动安装它们

# 获取脚本所在目录
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# 切换到脚本所在目录
cd "$SCRIPT_DIR" || exit 1
echo "🔹 当前目录: $SCRIPT_DIR"

# 自动安装包管理器的函数
install_package_manager() {
    local pm=$1
    case $pm in
        yarn)
            echo "🔸 未检测到 yarn，正在全局安装 yarn..."
            npm install -g yarn
            ;;
        pnpm)
            echo "🔸 未检测到 pnpm，正在全局安装 pnpm..."
            npm install -g pnpm
            ;;
        npm)
            echo "🔸 未检测到 npm，请手动安装 Node.js 和 npm。"
            exit 1
            ;;
    esac
}

# 检查并安装依赖
if command -v yarn >/dev/null 2>&1; then
    echo "🔹 检测到 yarn，正在使用 yarn 安装依赖..."
    yarn install
elif command -v pnpm >/dev/null 2>&1; then
    echo "🔹 检测到 pnpm，正在使用 pnpm 安装依赖..."
    pnpm install
elif command -v npm >/dev/null 2>&1; then
    echo "🔹 检测到 npm，正在使用 npm 安装依赖..."
    npm install
else
    echo "❌ 未找到 yarn、pnpm 或 npm，尝试自动安装 npm..."
    install_package_manager npm
    echo "🔹 已安装 npm，开始安装 yarn..."
    install_package_manager yarn
    echo "🔹 使用 yarn 安装依赖..."
    yarn install
fi

echo "✅ 依赖安装完成！"
