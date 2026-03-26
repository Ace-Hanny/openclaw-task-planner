# 配置说明

本文档详细说明 OpenClaw Task Planner 的配置选项。

## 配置文件结构

配置文件位于 `pomodoro/config.json`，包含以下主要配置项：

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

## 配置字段说明

### 顶层配置

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `port` | number | 否 | 9998 | Web 服务监听端口 |

### feishu 配置

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `appId` | string | 是 | 飞书应用 ID，以 `cli_` 开头 |
| `appSecret` | string | 是 | 飞书应用密钥 |
| `appToken` | string | 是 | 多维表格 App Token |
| `dailyPlanTableId` | string | 是 | 日计划表 Table ID |
| `executionLogTableId` | string | 是 | 执行记录表 Table ID |
| `userOpenId` | string | 是 | 用户 Open ID，以 `ou_` 开头 |

### 字段详细说明

#### port

Web 服务监听端口。

- **类型**: number
- **默认值**: 9998
- **示例**: 
  ```json
  "port": 8080
  ```

#### feishu.appId

飞书应用的唯一标识符。

- **获取方式**: 飞书开放平台 → 应用详情 → 凭证与基础信息
- **格式**: 以 `cli_` 开头的字符串
- **示例**: `cli_a1b2c3d4e5f6g7h8`

#### feishu.appSecret

飞书应用的密钥，用于获取访问令牌。

- **获取方式**: 飞书开放平台 → 应用详情 → 凭证与基础信息
- **安全提示**: 请妥善保管，不要提交到公开仓库
- **格式**: 32 位字符串

#### feishu.appToken

多维表格应用的唯一标识。

- **获取方式**: 打开多维表格，从 URL 中获取
- **URL 格式**: `https://xxx.feishu.cn/base/[AppToken]?table=...`
- **示例**: `B1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

#### feishu.dailyPlanTableId

日计划表的 Table ID。

- **获取方式**: 多维表格 URL 中的 `table` 参数
- **URL 格式**: `https://xxx.feishu.cn/base/[AppToken]?table=[TableId]`
- **格式**: 以 `tbl` 开头的字符串
- **示例**: `tblXxxxxxxxxxxxxxxx`

#### feishu.executionLogTableId

执行记录表的 Table ID。

- **获取方式**: 同上，切换到执行记录表后从 URL 获取
- **格式**: 以 `tbl` 开头的字符串

#### feishu.userOpenId

用户的 Open ID，用于标识用户身份。

- **获取方式**: 
  1. 通过飞书 API 获取
  2. 从消息事件中获取
- **格式**: 以 `ou_` 开头的字符串
- **示例**: `ou_xxxxxxxxxxxxxxxxxxxxxxxx`

## 飞书应用权限配置

### 必需权限

| 权限名称 | 权限标识 | 用途 |
|----------|----------|------|
| 查看、评论、编辑和管理多维表格 | `bitable:record` | 读写任务记录 |
| 获取多维表格元数据 | `bitable:app` | 获取表格结构信息 |
| 获取用户基本信息 | `contact:user.base:readonly` | 获取用户身份信息 |

### 权限配置步骤

1. 登录 [飞书开放平台](https://open.feishu.cn/app)
2. 选择应用 → 权限管理
3. 搜索并开通上述权限
4. 发布新版本使权限生效

### 权限验证

使用 API 调试工具验证权限：

```bash
# 获取 tenant_access_token
curl -X POST 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal' \
  -H 'Content-Type: application/json' \
  -d '{
    "app_id": "your_app_id",
    "app_secret": "your_app_secret"
  }'

# 测试读取多维表格
curl 'https://open.feishu.cn/open-apis/bitable/v1/apps/[AppToken]/tables/[TableId]/records' \
  -H 'Authorization: Bearer [tenant_access_token]'
```

## 多维表格字段说明

### 日计划表字段

| 字段名 | 字段类型 | 字段 ID | 说明 |
|--------|----------|---------|------|
| 计划日期 | 文本 | - | 格式：YYYY-MM-DD，用于筛选当日任务 |
| 时间块 | 文本 | - | 任务执行时间段，如「09:00-11:00」 |
| 任务安排 | 文本 | - | 任务名称或描述 |
| 来源 | 单选 | - | 任务来源分类 |
| 状态 | 单选 | - | 任务执行状态 |
| 预计耗时 | 数字 | - | 预计番茄钟数量 |
| 实际耗时 | 数字 | - | 实际消耗番茄钟数量 |

### 执行记录表字段

| 字段名 | 字段类型 | 说明 |
|--------|----------|------|
| 执行日期 | 日期 | 番茄钟执行日期 |
| 时间段 | 文本 | 执行时间段，如「10:00-10:25」 |
| 任务 | 文本 | 关联的任务名称 |
| 番茄钟数 | 数字 | 本次完成的番茄钟数量 |
| 实际耗时 | 数字 | 实际耗时（分钟） |
| 任务ID | 文本 | 关联的日计划表记录 ID |

### 字段创建注意事项

1. **字段名称必须完全一致** - 系统通过字段名称读写数据
2. **单选字段选项** - 必须包含以下选项：
   - 来源：周计划、每日习惯、临时任务
   - 状态：待执行、进行中、已完成
3. **数字字段** - 无需设置单位，系统默认为番茄钟数或分钟

## 环境变量配置（可选）

除了使用 `config.json`，也可以通过环境变量配置：

```bash
# 服务端口
export PORT=9998

# 飞书应用配置
export FEISHU_APP_ID="cli_xxxxxxxxxxxx"
export FEISHU_APP_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
export FEISHU_APP_TOKEN="xxxxxxxxxxxxxxxxxxxxxxxx"
export FEISHU_DAILY_PLAN_TABLE_ID="tblxxxxxxxxxxxxxx"
export FEISHU_EXECUTION_LOG_TABLE_ID="tblxxxxxxxxxxxxxx"
export FEISHU_USER_OPEN_ID="ou_xxxxxxxxxxxxx"
```

### 环境变量优先级

环境变量优先级高于 `config.json`，适合：
- Docker 容器部署
- CI/CD 环境
- 敏感信息管理

### Docker 部署示例

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY pomodoro/package*.json ./
RUN npm install --production
COPY pomodoro/ ./
EXPOSE 9998
CMD ["npm", "start"]
```

```bash
# 运行容器
docker run -d \
  -p 9998:9998 \
  -e FEISHU_APP_ID="cli_xxx" \
  -e FEISHU_APP_SECRET="xxx" \
  -e FEISHU_APP_TOKEN="xxx" \
  -e FEISHU_DAILY_PLAN_TABLE_ID="tblxxx" \
  -e FEISHU_EXECUTION_LOG_TABLE_ID="tblxxx" \
  -e FEISHU_USER_OPEN_ID="ou_xxx" \
  openclaw-task-planner
```

## 配置验证

启动服务后，可通过以下方式验证配置：

### 1. 健康检查

```bash
curl http://localhost:9998/api/health
```

预期响应：
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 2. 获取今日任务

```bash
curl http://localhost:9998/api/tasks/today
```

如果配置正确，将返回今日任务列表。

### 3. 查看日志

启动时查看控制台输出：

```
🍅 番茄钟服务已启动: http://localhost:9998
📋 配置文件: /path/to/config.json
✅ 获取 Token 成功，有效期至: 2024-01-01 12:00:00
```

如果看到 `❌ 获取 Token 失败`，请检查应用凭证配置。

## 安全建议

1. **不要提交 config.json 到版本控制**
   - 已在 `.gitignore` 中排除
   
2. **定期更换 App Secret**
   - 飞书开放平台支持重置密钥

3. **限制应用权限范围**
   - 仅开通必需权限

4. **生产环境使用环境变量**
   - 避免敏感信息硬编码

## 相关文档

- [安装指南](./installation.md) - 详细安装步骤
- [README.md](../README.md) - 项目概述
