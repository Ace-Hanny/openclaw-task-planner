#!/bin/bash

# OpenClaw Task Planner - 飞书配置脚本
# 交互式引导用户配置飞书应用

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印函数
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

CONFIG_FILE="config.json"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         OpenClaw Task Planner - 飞书配置向导             ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 检查是否在正确的目录
if [ ! -f "config.example.json" ] && [ ! -f "config.json" ]; then
    # 尝试进入 pomodoro 目录
    if [ -d "pomodoro" ]; then
        cd pomodoro
    else
        error "请在项目根目录或 pomodoro 目录下运行此脚本"
    fi
fi

# 如果配置文件不存在，从模板创建
if [ ! -f "$CONFIG_FILE" ]; then
    if [ -f "config.example.json" ]; then
        cp config.example.json "$CONFIG_FILE"
        info "已从模板创建 config.json"
    else
        error "找不到 config.example.json 模板文件"
    fi
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}第一步：飞书应用配置${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "请先在飞书开放平台创建应用："
echo -e "  ${BLUE}https://open.feishu.cn/app${NC}"
echo ""
echo "创建后，在应用的「凭证与基础信息」页面获取："
echo ""

# 读取 App ID
echo -ne "${YELLOW}请输入 App ID:${NC} "
read APP_ID

if [ -z "$APP_ID" ]; then
    error "App ID 不能为空"
fi

# 读取 App Secret
echo -ne "${YELLOW}请输入 App Secret:${NC} "
read -s APP_SECRET
echo ""

if [ -z "$APP_SECRET" ]; then
    error "App Secret 不能为空"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}第二步：多维表格配置${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "请创建多维表格并获取相关信息："
echo -e "  ${BLUE}https://feishu.cn/product/bitable${NC}"
echo ""
echo "多维表格 URL 格式示例："
echo "  https://xxx.feishu.cn/base/YOUR_APP_TOKEN?table=YOUR_TABLE_ID"
echo ""
echo "从 URL 中可以获取："
echo "  - App Token: base/ 后面的字符串"
echo "  - Table ID: table= 后面的字符串"
echo ""

# 读取 App Token
echo -ne "${YELLOW}请输入多维表格 App Token:${NC} "
read APP_TOKEN

if [ -z "$APP_TOKEN" ]; then
    error "App Token 不能为空"
fi

# 读取日计划表 ID
echo -ne "${YELLOW}请输入日计划表 Table ID:${NC} "
read DAILY_PLAN_TABLE_ID

if [ -z "$DAILY_PLAN_TABLE_ID" ]; then
    error "日计划表 Table ID 不能为空"
fi

# 读取执行记录表 ID
echo -ne "${YELLOW}请输入执行记录表 Table ID:${NC} "
read EXECUTION_LOG_TABLE_ID

if [ -z "$EXECUTION_LOG_TABLE_ID" ]; then
    error "执行记录表 Table ID 不能为空"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}第三步：用户信息配置${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "获取 User Open ID 的方法："
echo "  1. 在飞书开放平台，进入应用"
echo "  2. 在「权限管理」中开通「获取用户信息」权限"
echo "  3. 使用 API 或调试工具获取你的 Open ID"
echo ""
echo "  或者在浏览器控制台执行："
echo "  ${BLUE}JSON.parse(localStorage.getItem('user')).open_id${NC}"
echo ""

# 读取 User Open ID
echo -ne "${YELLOW}请输入你的 User Open ID (可选，按回车跳过):${NC} "
read USER_OPEN_ID

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}配置确认${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "以下配置将被写入 config.json："
echo ""
echo -e "  App ID:              ${GREEN}$APP_ID${NC}"
echo -e "  App Secret:          ${GREEN}****${NC}"
echo -e "  App Token:           ${GREEN}$APP_TOKEN${NC}"
echo -e "  日计划表 ID:         ${GREEN}$DAILY_PLAN_TABLE_ID${NC}"
echo -e "  执行记录表 ID:       ${GREEN}$EXECUTION_LOG_TABLE_ID${NC}"
echo -e "  User Open ID:        ${GREEN}${USER_OPEN_ID:-"(未设置)"}${NC}"
echo ""

# 确认
echo -ne "${YELLOW}确认写入配置？(y/n):${NC} "
read CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    warn "已取消配置"
    exit 0
fi

# 生成配置文件
cat > "$CONFIG_FILE" << EOF
{
  "port": 9998,
  "feishu": {
    "appId": "$APP_ID",
    "appSecret": "$APP_SECRET",
    "appToken": "$APP_TOKEN",
    "dailyPlanTableId": "$DAILY_PLAN_TABLE_ID",
    "executionLogTableId": "$EXECUTION_LOG_TABLE_ID",
    "userOpenId": "${USER_OPEN_ID:-your_user_open_id}"
  }
}
EOF

success "配置文件已生成: $CONFIG_FILE"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  配置完成！                              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "启动命令:"
echo "  ${GREEN}npm start${NC}"
echo ""
echo "访问地址: ${BLUE}http://localhost:9998${NC}"
echo ""
