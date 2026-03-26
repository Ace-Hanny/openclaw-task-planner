# 安装指南

本文档详细介绍 OpenClaw Task Planner 的安装和配置过程。

## 环境要求

| 依赖 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | >= 14.0.0 | 推荐使用 LTS 版本（18.x 或 20.x） |
| npm | >= 6.0.0 | 随 Node.js 自动安装 |
| Git | 任意版本 | 用于克隆仓库 |

### 检查环境

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v

# 检查 Git
git --version
```

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/Ace-Hanny/openclaw-task-planner.git
cd openclaw-task-planner
```

### 2. 安装依赖

```bash
cd pomodoro
npm install
```

依赖包括：
- `express` - Web 服务器框架
- `cors` - 跨域支持
- `node-fetch` - HTTP 请求库

### 3. 配置飞书应用

#### 3.1 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn/app)
2. 点击「创建企业自建应用」
3. 填写应用名称，如「任务规划助手」
4. 创建完成后，记录以下信息：
   - **App ID** - 应用唯一标识
   - **App Secret** - 应用密钥

#### 3.2 配置应用权限

在应用的「权限管理」页面，开通以下权限：

| 权限名称 | 权限标识 | 用途 |
|----------|----------|------|
| 查看、评论、编辑和管理多维表格 | `bitable:record` | 读写任务记录 |
| 获取多维表格元数据 | `bitable:app` | 获取表格信息 |
| 获取用户基本信息 | `contact:user.base:readonly` | 获取用户信息 |

权限配置步骤：
1. 进入「权限管理」→「权限配置」
2. 搜索上述权限并开通
3. 点击「发布版本」使权限生效

#### 3.3 获取 user_open_id

1. 在飞书客户端，打开「飞书开放平台」机器人
2. 发送任意消息
3. 在开发者后台的「事件订阅」中查看消息事件
4. 从事件体中获取 `sender.sender_id.open_id`

或者使用飞书 API 调试工具获取。

### 4. 创建多维表格

#### 4.1 创建多维表格应用

1. 打开飞书「多维表格」
2. 创建新的多维表格，命名为「任务规划系统」
3. 从浏览器地址栏获取 **App Token**：
   ```
   https://xxx.feishu.cn/base/[AppToken]?table=...
   ```

#### 4.2 创建数据表

根据 `templates/bitable-structure.json` 创建两个数据表：

**日计划表（dailyPlanTable）**

| 字段名 | 字段类型 | 说明 |
|--------|----------|------|
| 计划日期 | 文本 | 格式：YYYY-MM-DD |
| 时间块 | 文本 | 如：09:00-11:00 |
| 任务安排 | 文本 | 任务名称 |
| 来源 | 单选 | 选项：周计划、每日习惯、临时任务 |
| 状态 | 单选 | 选项：待执行、进行中、已完成 |
| 预计耗时 | 数字 | 番茄钟数 |
| 实际耗时 | 数字 | 番茄钟数 |

**执行记录表（executionLogTable）**

| 字段名 | 字段类型 | 说明 |
|--------|----------|------|
| 执行日期 | 日期 | 执行日期 |
| 时间段 | 文本 | 如：10:00-10:25 |
| 任务 | 文本 | 任务名称 |
| 番茄钟数 | 数字 | 完成的番茄钟数 |
| 实际耗时 | 数字 | 实际耗时（分钟） |
| 任务ID | 文本 | 日计划表记录ID |

#### 4.3 获取表格 ID

创建完成后，从 URL 或 API 获取各表格的 **Table ID**：
```
https://xxx.feishu.cn/base/[AppToken]?table=[TableId]
```

### 5. 配置应用

#### 5.1 复制配置模板

```bash
cd pomodoro
cp config.example.json config.json
```

#### 5.2 编辑配置文件

编辑 `config.json`，填入实际配置：

```json
{
  "port": 9998,
  "feishu": {
    "appId": "cli_xxxxxxxxxxxx",
    "appSecret": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "appToken": "xxxxxxxxxxxxxxxxxxxxxxxx",
    "dailyPlanTableId": "tblxxxxxxxxxxxxxx",
    "executionLogTableId": "tblxxxxxxxxxxxxxx",
    "userOpenId": "ou_xxxxxxxxxxxxx"
  }
}
```

### 6. 启动服务

```bash
npm start
```

看到以下输出表示启动成功：

```
🍅 番茄钟服务已启动: http://localhost:9998
📋 配置文件: /path/to/config.json
```

访问 http://localhost:9998 即可使用。

## 常见问题排查

### Q1: 启动后无法访问

**检查端口占用：**
```bash
# 检查 9998 端口是否被占用
lsof -i :9998

# 或使用其他端口
# 修改 config.json 中的 port 字段
```

**检查防火墙：**
```bash
# 开放端口（如需要）
firewall-cmd --add-port=9998/tcp --permanent
firewall-cmd --reload
```

### Q2: 获取 Token 失败

**可能原因：**
- App ID 或 App Secret 填写错误
- 应用未发布或权限未生效
- 网络无法访问飞书 API

**排查步骤：**
```bash
# 测试网络连通性
curl https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal

# 检查配置文件格式
cat config.json | python -m json.tool
```

### Q3: 无法读取多维表格数据

**可能原因：**
- App Token 或 Table ID 错误
- 应用未开通多维表格权限
- 多维表格未共享给应用

**解决方案：**
1. 检查多维表格权限配置
2. 确认应用已添加为多维表格协作者
3. 在飞书开放平台使用 API 调试工具测试

### Q4: Token 过期问题

系统会自动缓存 Token 并在过期前刷新。如果遇到 Token 过期：

1. 删除 Token 缓存文件：
   ```bash
   rm pomodoro/.token-cache.json
   ```

2. 重启服务

### Q5: 配置文件加载失败

**检查配置文件：**
```bash
# 确认文件存在
ls -la pomodoro/config.json

# 检查 JSON 格式
node -e "console.log(JSON.parse(require('fs').readFileSync('pomodoro/config.json', 'utf8')))"
```

### Q6: Node.js 版本过低

如果系统 Node.js 版本低于 14.0.0：

```bash
# 使用 nvm 安装新版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

## 下一步

安装完成后，请参阅 [配置说明](./configuration.md) 了解详细配置选项。
