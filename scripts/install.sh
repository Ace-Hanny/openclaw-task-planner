#!/bin/bash

# OpenClaw Task Planner - 一键安装脚本
# 用法: curl -fsSL https://raw.githubusercontent.com/Ace-Hanny/openclaw-task-planner/main/scripts/install.sh | bash

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 项目信息
REPO_URL="https://github.com/Ace-Hanny/openclaw-task-planner.git"
PROJECT_DIR="openclaw-task-planner"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     OpenClaw Task Planner - 一键安装脚本                 ║"
echo "║     番茄钟 + 多维表格 + AI 规划                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# 1. 检查 Node.js 环境
info "检查 Node.js 环境..."

if ! command -v node &> /dev/null; then
    error "未安装 Node.js！请先安装 Node.js 16 或更高版本。\n下载地址: https://nodejs.org/"
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    error "Node.js 版本过低！当前版本: $(node -v)，需要 v16 或更高版本。\n请升级 Node.js: https://nodejs.org/"
fi

success "Node.js 版本: $(node -v)"
success "npm 版本: $(npm -v)"

# 2. 检查 Git
info "检查 Git..."

if ! command -v git &> /dev/null; then
    error "未安装 Git！请先安装 Git。\n安装方法: https://git-scm.com/book/zh/v2/起步-安装-Git"
fi

success "Git 已安装: $(git --version)"

# 3. 克隆或更新仓库
if [ -d "$PROJECT_DIR" ]; then
    info "检测到已存在的项目目录，正在更新..."
    cd "$PROJECT_DIR"
    git pull origin main || git pull origin master
    success "项目已更新到最新版本"
else
    info "克隆项目仓库..."
    git clone "$REPO_URL"
    cd "$PROJECT_DIR"
    success "项目克隆完成"
fi

# 4. 进入 pomodoro 目录
cd pomodoro

# 5. 安装依赖
info "安装项目依赖..."
npm install
success "依赖安装完成"

# 6. 创建配置文件
if [ -f "config.json" ]; then
    warn "config.json 已存在，跳过创建"
else
    info "创建配置文件..."
    cp config.example.json config.json
    success "config.json 已创建"
fi

# 7. 检查配置
if grep -q "your_app_id" config.json; then
    warn "请先配置飞书应用信息！"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "配置步骤："
    echo ""
    echo "1. 编辑配置文件:"
    echo "   ${YELLOW}nano config.json${NC}"
    echo "   或"
    echo "   ${YELLOW}vim config.json${NC}"
    echo ""
    echo "2. 填写以下信息:"
    echo "   - appId: 飞书应用 ID"
    echo "   - appSecret: 飞书应用密钥"
    echo "   - appToken: 多维表格 Token"
    echo "   - dailyPlanTableId: 日计划表 ID"
    echo "   - executionLogTableId: 执行记录表 ID"
    echo "   - userOpenId: 用户 Open ID"
    echo ""
    echo "3. 或运行交互式配置脚本:"
    echo "   ${YELLOW}../scripts/setup-feishu.sh${NC}"
    echo ""
    echo "4. 获取飞书应用信息:"
    echo "   - 创建应用: https://open.feishu.cn/app"
    echo "   - 多维表格: https://feishu.cn/product/bitable"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

# 8. 完成
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  安装完成！                              ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "启动命令:"
echo "  ${GREEN}cd $PROJECT_DIR/pomodoro && npm start${NC}"
echo ""
echo "访问地址: ${BLUE}http://localhost:9998${NC}"
echo ""
echo "更多帮助请查看: ${YELLOW}https://github.com/Ace-Hanny/openclaw-task-planner${NC}"
echo ""
