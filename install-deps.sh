#!/bin/bash

# 脚本名称: install-deps.sh
# 功能: 自动检测 yarn、pnpm、npm 并按优先级安装依赖，如未找到则自动安装它们
# 设置脚本默认执行目录为当前目录
WORK_DIR=$(pwd)

# 自动安装包管理器的函数
install_package_manager() {
    local pm=$1
    case $pm in
        yarn)
            echo "🔸 未检测到 yarn，正在全局安装 yarn..."
            npm install -g yarn || { echo "❌ yarn 安装失败，请检查网络或 npm 配置。"; exit 1; }
            ;;
        pnpm)
            echo "🔸 未检测到 pnpm，正在全局安装 pnpm..."
            npm install -g pnpm || { echo "❌ pnpm 安装失败，请检查网络或 npm 配置。"; exit 1; }
            ;;
        npm)
            echo "❌ 未检测到 npm，请手动安装 Node.js 和 npm。"
            exit 1
            ;;
    esac
}

# 检查包管理器是否可用，并安装依赖
install_dependencies() {
    local tool=$1
    case $tool in
        yarn)
            echo "🔹 使用 yarn 安装依赖..."
            yarn install --cwd "$WORK_DIR" || { echo "❌ yarn 安装依赖失败，请检查配置。"; exit 1; }
            ;;
        pnpm)
            echo "🔹 使用 pnpm 安装依赖..."
            pnpm install --dir "$WORK_DIR" || { echo "❌ pnpm 安装依赖失败，请检查配置。"; exit 1; }
            ;;
        npm)
            echo "🔹 使用 npm 安装依赖..."
            npm install --prefix "$WORK_DIR" || { echo "❌ npm 安装依赖失败，请检查配置。"; exit 1; }
            ;;
    esac
}

# 主逻辑
echo "🔍 正在检查包管理器..."

if command -v yarn >/dev/null 2>&1; then
    echo "✅ 检测到 yarn"
    install_dependencies yarn
elif command -v pnpm >/dev/null 2>&1; then
    echo "✅ 检测到 pnpm"
    install_dependencies pnpm
elif command -v npm >/dev/null 2>&1; then
    echo "✅ 检测到 npm"
    install_dependencies npm
else
    echo "❌ 未找到 yarn、pnpm 或 npm，尝试安装 npm..."
    install_package_manager npm
    echo "🔹 已安装 npm，开始安装 yarn..."
    install_package_manager yarn
    install_dependencies yarn
fi

echo "🎉 依赖安装完成！"
echo "📁 项目目录: $WORK_DIR"