# OpenClaw Task Planner

> 任务规划系统 - 番茄钟 + 多维表格 + AI 规划

## 功能特性

- 🍅 **番茄钟计时器** - 25分钟专注 + 5分钟休息
- 📊 **飞书多维表格集成** - 任务管理 + 执行记录
- 📅 **日计划生成** - AI 辅助规划每日任务
- 📈 **统计分析** - 今日/本周/本月专注时长
- 🔄 **延续任务处理** - 自动追踪未完成任务

## 快速开始

### 方式一：一键安装（推荐）

```bash
curl -fsSL https://raw.githubusercontent.com/Ace-Hanny/openclaw-task-planner/main/scripts/install.sh | bash
```

安装完成后，运行交互式配置脚本：

```bash
cd openclaw-task-planner/pomodoro
../scripts/setup-feishu.sh
```

### 方式二：手动安装

#### 1. 克隆仓库

```bash
git clone https://github.com/Ace-Hanny/openclaw-task-planner.git
cd openclaw-task-planner
```

#### 2. 安装依赖

```bash
cd pomodoro
npm install
```

#### 3. 配置飞书应用

1. 创建飞书应用：https://open.feishu.cn/app
2. 获取 App ID 和 App Secret
3. 创建多维表格，获取 App Token 和表格 ID
4. 复制配置模板：

```bash
cp config.example.json config.json
```

5. 编辑 `config.json`，填入你的配置

#### 4. 启动服务

```bash
npm start
```

访问 http://localhost:9998

## 多维表格结构

### 日计划表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 计划日期 | 文本 | 格式：YYYY-MM-DD |
| 时间块 | 文本 | 如：09:00-11:00 |
| 任务安排 | 文本 | 任务名称 |
| 来源 | 单选 | 周计划/每日习惯 |
| 状态 | 单选 | 待执行/进行中/已完成 |
| 预计耗时 | 数字 | 番茄钟数 |

### 执行记录表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| 执行日期 | 日期 | 执行日期 |
| 时间段 | 文本 | 如：10:00-10:25 |
| 任务 | 文本 | 任务名称 |
| 番茄钟数 | 数字 | 完成的番茄钟数 |
| 实际耗时 | 数字 | 实际耗时（分钟） |

## 使用说明

### 番茄钟操作

- **开始/暂停** - 点击计时器或按空格键
- **重置** - 按 R 键
- **切换主题** - 按 D 键

### 任务管理

- 任务按时间块自动排序
- 延续任务标记为 📅
- 完成任务自动更新状态

## 技术栈

- Node.js + Express
- 飞书开放平台 API
- 飞书多维表格

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
