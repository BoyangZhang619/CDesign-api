# CDesign API 完整文档

## 📋 目录

1. [基础信息](#基础信息)
2. [通用说明](#通用说明)
3. [认证接口](#认证接口)
4. [AI 对话接口](#ai-对话接口)
5. [数据库接口](#数据库接口)
6. [错误处理](#错误处理)
7. [快速开始](#快速开始)
8. [完整 curl 脚本](#完整curl脚本)

---

## 基础信息

| 项目 | 说明 |
|-----|------|
| **API 基础 URL** | `https://cda.api.zbyblq.xin` |
| **认证方式** | JWT (Bearer Token) + Refresh Token (HttpOnly Cookie) |
| **内容类型** | `application/json` |
| **请求超时** | 30 秒 |
| **速率限制** | 无（建议自行实现） |

### 支持的域名

- 生产环境：`https://cda.api.zbyblq.xin`
- 本地开发：`http://localhost:8080`

### 跨域配置（CORS）

已配置允许的来源：
- `http://localhost:5173` (Vite 前端)
- `http://localhost:5174` (Vite 前端)
- `https://cdw.zbyblq.xin` (生产前端)

---

## 通用说明

### 响应格式

所有 API 响应都遵循统一格式：

#### ✅ 成功响应 (HTTP 200)

```json
{
  "success": true,
  "message": "操作成功描述",
  "data": {
    // 响应数据
  }
}
```

#### ❌ 错误响应 (HTTP 4xx/5xx)

```json
{
  "success": false,
  "message": "错误描述信息",
  "data": null
}
```

### 认证方式

#### Bearer Token (用于需要认证的接口)

```bash
Authorization: Bearer YOUR_ACCESS_TOKEN
```

#### Refresh Token (自动在 Cookie 中)

- 名称：`refreshToken`
- 类型：HttpOnly Cookie（浏览器自动发送）
- 有效期：7 天
- 自动轮换：每次刷新时更新

### 常见 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| `200` | 成功 |
| `400` | 请求参数错误 |
| `401` | 未授权（Token 无效或过期） |
| `403` | 禁止访问（权限不足） |
| `404` | 资源不存在 |
| `500` | 服务器错误 |

---

## 认证接口

### 1. 用户注册

创建新用户账户。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/auth/register` |
| 认证 | ❌ 否 |
| 内容类型 | `application/json` |

**请求体参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `username` | `string` | ✅ | 用户名（唯一） |
| `password` | `string` | ✅ | 密码（至少 6 位） |

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "message": "注册成功"
  }
}
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `400` | 用户名和密码不能为空 | 缺少必要参数 |
| `400` | 用户已存在 | 用户名已被注册 |
| `500` | 注册失败 | 服务器错误 |

---

### 2. 用户登录

使用用户名和密码登录，获取 Access Token。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/auth/login` |
| 认证 | ❌ 否 |
| 内容类型 | `application/json` |

**请求体参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `username` | `string` | ✅ | 用户名 |
| `password` | `string` | ✅ | 密码 |

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "message": "登录成功",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "username": "testuser"
    }
  }
}
```

**响应头**

```
Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=604800
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `400` | 用户名和密码不能为空 | 缺少必要参数 |
| `400` | 用户不存在 | 用户名不存在 |
| `400` | 密码错误 | 密码不匹配 |
| `500` | 登录失败 | 服务器错误 |

---

### 3. 刷新 Token

使用 Refresh Token 获取新的 Access Token（Token 轮换）。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/auth/refresh` |
| 认证 | ❌ 否（使用 Cookie 中的 refreshToken） |
| 内容类型 | `application/json` |

**请求体参数**

无（使用 Cookie 中的 refreshToken）

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/refresh \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "credits": 1000
    }
  }
}
```

**响应头**

```
Set-Cookie: refreshToken=new_token; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=604800
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `401` | 缺少 refresh token | 没有提供 refresh token |
| `401` | 无效的 refresh token | Token 签名无效 |
| `401` | refresh token 不存在 | Token 未在数据库中 |
| `401` | refresh token 已失效 | Token 已被撤销 |
| `401` | 用户不存在 | 用户被删除 |
| `500` | 刷新失败 | 服务器错误 |

**工作流程**

```
1. Access Token 过期
   ↓
2. 客户端向 /api/auth/refresh 发送请求
   ↓
3. 服务器验证 Refresh Token
   ↓
4. 作废旧 Refresh Token
   ↓
5. 返回新 Access Token 和新 Refresh Token
```

---

### 4. 获取当前用户信息

获取已认证用户的详细信息。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `GET` |
| 路由 | `/api/auth/me` |
| 认证 | ✅ 是 (Bearer Token) |
| 内容类型 | `application/json` |

**请求示例**

```bash
curl -X GET https://cda.api.zbyblq.xin/api/auth/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "success",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "credits": 1000,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `401` | Unauthorized，缺失或者无效的令牌 | Token 无效或过期 |
| `404` | 用户不存在 | 用户被删除 |
| `500` | 获取用户信息失败 | 服务器错误 |

---

### 5. 单设备登出

登出当前设备（删除当前 Refresh Token）。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/auth/logout` |
| 认证 | ❌ 否 |
| 内容类型 | `application/json` |

**请求体参数**

无

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c /dev/null
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "success",
  "data": {
    "message": "退出成功"
  }
}
```

**响应头**

```
Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=0
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `500` | 退出失败 | 服务器错误 |

---

### 6. 全设备登出

登出所有设备（撤销所有 Refresh Token）。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/auth/logout-all` |
| 认证 | ✅ 是 (Bearer Token) |
| 内容类型 | `application/json` |

**请求体参数**

无

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/logout-all \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "success",
  "data": {
    "message": "已退出所有设备"
  }
}
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `401` | Unauthorized，缺失或者无效的令牌 | Token 无效或过期 |
| `500` | 操作失败 | 服务器错误 |

**使用场景**

- 用户修改密码后，需要全部设备重新登录
- 用户账户安全问题，需要撤销所有 Token
- 用户主动要求全部设备登出

---

## AI 对话接口

### 1. 普通对话（非流式）

发送消息并获取完整的 AI 响应。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/ai/ptio/common` |
| 认证 | ✅ 是 (Bearer Token) |
| 内容类型 | `application/json` |
| 需要额度 | ✅ 是 |

**请求体参数**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `message` | `string` | ✅ | - | 用户输入的消息 |
| `model` | `string` | ❌ | `qwen3.5-flash` | 模型选择：`qwen3.5-flash` \| `qwen3.5-max` |
| `system_content` | `string` | ❌ | 默认系统提示词 | 自定义系统提示词 |
| `enable_thinking` | `boolean` | ❌ | `false` | 启用 AI 思考过程（仅 max 模型支持） |
| `response_type` | `string` | ❌ | `text` | 响应类型：`text` \| `json_object` |
| `response_language` | `string` | ❌ | `Chinese` | 响应语言：`Chinese` \| `English` \| `Japanese` \| `French` \| `German` |
| `other` | `object` | ❌ | `{}` | 其他自定义参数 |

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/ai/ptio/common \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "请解释什么是机器学习",
    "model": "qwen3.5-flash",
    "response_language": "Chinese"
  }'
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "success",
  "data": {
    "ok": true,
    "model": "qwen3.5-flash",
    "content": "机器学习是人工智能的一个重要分支，它使计算机能够通过数据学习而不需要显式编程...",
    "usage": {
      "total_tokens": 245
    }
  }
}
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `401` | Unauthorized，缺失或者无效的令牌 | Token 无效 |
| `401` | 未授权或用户信息无效 | 用户信息有问题 |
| `403` | 额度不足 | 用户 credits 不足 |
| `404` | 用户不存在 | 用户被删除 |
| `500` | 请求失败 | AI 服务或服务器错误 |

**费用说明**

- 消耗用户 credits（等于 `usage.total_tokens`）
- 不同模型消耗不同：`qwen3.5-max` 比 `qwen3.5-flash` 消耗更多
- 如果响应失败，不扣费

---

### 2. 流式对话（SSE）

发送消息并以流方式逐步接收 AI 的实时响应。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/ai/ptio/stream` |
| 认证 | ✅ 是 (Bearer Token) |
| 内容类型 | `application/json` |
| 响应类型 | `text/event-stream` |
| 需要额度 | ✅ 是 |

**请求体参数**

同「普通对话」接口

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/ai/ptio/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "写一首关于春天的诗",
    "model": "qwen3.5-max",
    "response_language": "Chinese"
  }'
```

**流响应格式**

每个消息行以 `data: ` 开头，格式为 JSON。

```
data: {"type":"reasoning","content":"让我思考一下这首诗的主题..."}

data: {"type":"content","content":"春回大地"}

data: {"type":"content","content":"万物复苏"}

data: {"type":"done","usage":{"total_tokens":512}}
```

**流消息类型**

| 类型 | 说明 | 示例 |
|------|------|------|
| `reasoning` | AI 的思考过程（仅 enable_thinking=true 时） | `{"type":"reasoning","content":"..."}` |
| `content` | 响应内容（实时逐字输出） | `{"type":"content","content":"..."}` |
| `done` | 流传输完成 | `{"type":"done","usage":{"total_tokens":512}}` |
| `error` | 错误信息 | `{"type":"error","content":"错误描述"}` |

**JavaScript 客户端示例**

```javascript
const accessToken = 'YOUR_ACCESS_TOKEN';
const response = await fetch('https://cda.api.zbyblq.xin/api/ai/ptio/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    message: '用 Python 写一个快速排序算法',
    model: 'qwen3.5-max',
    response_language: 'Chinese'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  
  // 保留最后一个不完整的行
  buffer = lines.pop() || '';
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const message = JSON.parse(line.slice(6));
        
        if (message.type === 'reasoning') {
          console.log('🤔 思考中:', message.content);
        } else if (message.type === 'content') {
          console.log('📝 响应:', message.content);
          // 实时显示到 UI
        } else if (message.type === 'done') {
          console.log('✅ 完成，消耗 tokens:', message.usage.total_tokens);
        } else if (message.type === 'error') {
          console.error('❌ 错误:', message.content);
        }
      } catch (e) {
        console.error('解析错误:', e);
      }
    }
  }
}
```

**错误响应**

同「普通对话」接口

---

## 数据库接口

### 执行自定义 SQL 查询

直接执行 SQL 语句查询数据库（**谨慎使用**）。

**请求信息**

| 项 | 值 |
|----|---|
| 请求方式 | `POST` |
| 路由 | `/api/sql` |
| 认证 | ❌ 否（⚠️ 建议添加认证） |
| 内容类型 | `application/json` |

**请求体参数**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `sql` | `string` | ✅ | SQL 语句（支持参数占位符 `?`） |
| `params` | `array` | ❌ | 参数数组，用于替换 SQL 中的 `?` |

**请求示例**

```bash
curl -X POST https://cda.api.zbyblq.xin/api/sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT id, username FROM users WHERE id = ?",
    "params": [123]
  }'
```

**成功响应 (200)**

```json
{
  "success": true,
  "message": "success",
  "data": [
    {
      "id": 123,
      "username": "testuser"
    }
  ]
}
```

**错误响应**

| 状态码 | 错误信息 | 说明 |
|--------|---------|------|
| `400` | POST 请求无数据 | 没有提供请求体 |
| `400` | POST 请求 sql 语句为空 | 没有提供 sql 参数 |
| `500` | SQL 执行失败 | SQL 语法错误或数据库错误 |

**安全提示**

⚠️ **重要**: 
1. 已使用参数化查询防止 SQL 注入
2. 但建议在生产环境添加认证和授权
3. 避免暴露敏感的 SQL 操作（如 DROP、DELETE 等）

---

## 错误处理

### 错误响应格式

所有错误都遵循统一格式：

```json
{
  "success": false,
  "message": "具体的错误描述",
  "data": null
}
```

### 常见错误代码

#### 认证错误 (401)

```json
{
  "success": false,
  "message": "Unauthorized，缺失或者无效的令牌",
  "data": null
}
```

**原因**：
- Token 不存在或格式错误
- Token 已过期
- Token 签名无效

**解决方案**：
1. 检查 `Authorization` 请求头格式：`Bearer YOUR_TOKEN`
2. 使用 `/api/auth/refresh` 刷新 Token
3. 如果 Refresh Token 也过期，重新登录

#### 权限不足 (403)

```json
{
  "success": false,
  "message": "额度不足",
  "data": null
}
```

**原因**：用户 credits 不足，无法调用 AI 接口

**解决方案**：
1. 检查用户 credits：`GET /api/auth/me`
2. 联系管理员充值
3. 使用消耗更少 tokens 的模型

#### 参数错误 (400)

```json
{
  "success": false,
  "message": "用户名和密码不能为空",
  "data": null
}
```

**原因**：请求参数缺失或格式错误

**解决方案**：
1. 检查请求体是否包含所有必需参数
2. 确保参数类型正确
3. 参考接口文档验证参数

#### 服务器错误 (500)

```json
{
  "success": false,
  "message": "登录失败",
  "data": null
}
```

**原因**：服务器内部错误

**解决方案**：
1. 查看服务器日志
2. 检查数据库连接
3. 联系技术支持

---

## 快速开始

### 完整的认证流程

```bash
# 1. 注册账户
curl -X POST https://cda.api.zbyblq.xin/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "myuser",
    "password": "mypassword123"
  }'

# 2. 登录获取 Token
LOGIN_RESPONSE=$(curl -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "myuser",
    "password": "mypassword123"
  }')

# 从响应中提取 accessToken
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 3. 使用 Token 调用 API
curl -X GET https://cda.api.zbyblq.xin/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 4. 刷新 Token
curl -X POST https://cda.api.zbyblq.xin/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt

# 5. 登出
curl -X POST https://cda.api.zbyblq.xin/api/auth/logout \
  -b cookies.txt
```

---

## 完整curl脚本

### test-api.sh - 完整 API 测试脚本

将以下内容保存为 `test-api.sh`，然后运行 `bash test-api.sh`：

```bash
#!/bin/bash

# ==========================================
# CDesign API 完整测试脚本
# ==========================================

API_BASE="https://cda.api.zbyblq.xin"
COOKIES_FILE="cookies.txt"
COLORS_GREEN='\033[0;32m'
COLORS_RED='\033[0;31m'
COLORS_BLUE='\033[0;34m'
COLORS_YELLOW='\033[1;33m'
NC='\033[0m' # 无颜色

# 清理旧的 cookies
rm -f $COOKIES_FILE

echo -e "${COLORS_BLUE}========================================${NC}"
echo -e "${COLORS_BLUE}CDesign API 完整测试脚本${NC}"
echo -e "${COLORS_BLUE}========================================${NC}\n"

# ==========================================
# 1. 注册测试
# ==========================================
echo -e "${COLORS_YELLOW}[1] 注册新用户${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "password": "password123"
  }')

echo "$REGISTER_RESPONSE" | jq .
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ 注册成功${NC}\n"
  USERNAME=$(echo "$REGISTER_RESPONSE" | jq -r '.data.username // "testuser_'$(date +%s)'"')
else
  echo -e "${COLORS_RED}❌ 注册失败${NC}\n"
  exit 1
fi

# ==========================================
# 2. 登录测试
# ==========================================
echo -e "${COLORS_YELLOW}[2] 用户登录${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -c $COOKIES_FILE \
  -d '{
    "username": "'$USERNAME'",
    "password": "password123"
  }')

echo "$LOGIN_RESPONSE" | jq .
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ 登录成功${NC}\n"
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
else
  echo -e "${COLORS_RED}❌ 登录失败${NC}\n"
  exit 1
fi

# ==========================================
# 3. 获取用户信息测试
# ==========================================
echo -e "${COLORS_YELLOW}[3] 获取用户信息${NC}"
ME_RESPONSE=$(curl -s -X GET $API_BASE/api/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | jq .
if echo "$ME_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ 获取用户信息成功${NC}\n"
  USER_ID=$(echo "$ME_RESPONSE" | jq -r '.data.user.id')
  USER_CREDITS=$(echo "$ME_RESPONSE" | jq -r '.data.user.credits')
else
  echo -e "${COLORS_RED}❌ 获取用户信息失败${NC}\n"
fi

# ==========================================
# 4. AI 普通对话测试
# ==========================================
echo -e "${COLORS_YELLOW}[4] AI 普通对话${NC}"
echo "当前用户额度: $USER_CREDITS"

if [ "$USER_CREDITS" -gt 100 ]; then
  AI_RESPONSE=$(curl -s -X POST $API_BASE/api/ai/ptio/common \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
      "message": "你好，请用一句话介绍你自己",
      "model": "qwen3.5-flash",
      "response_language": "Chinese"
    }')

  echo "$AI_RESPONSE" | jq .
  if echo "$AI_RESPONSE" | grep -q '"success":true'; then
    echo -e "${COLORS_GREEN}✅ AI 对话成功${NC}\n"
    TOKENS_USED=$(echo "$AI_RESPONSE" | jq -r '.data.usage.total_tokens')
    echo "本次消耗 tokens: $TOKENS_USED"
  else
    echo -e "${COLORS_RED}❌ AI 对话失败${NC}\n"
  fi
else
  echo -e "${COLORS_YELLOW}⚠️  用户额度不足，跳过 AI 对话测试${NC}\n"
fi

# ==========================================
# 5. AI 流式对话测试
# ==========================================
echo -e "${COLORS_YELLOW}[5] AI 流式对话${NC}"
echo "请求流式对话，响应实时显示：\n"

curl -s -X POST $API_BASE/api/ai/ptio/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "message": "用三个词描述人工智能",
    "model": "qwen3.5-flash",
    "response_language": "Chinese"
  }' | while IFS= read -r line; do
  if [[ $line == data:* ]]; then
    echo "$line" | sed 's/^data: //' | jq '.' 2>/dev/null || echo "$line"
  fi
done

echo -e "\n${COLORS_GREEN}✅ 流式对话完成${NC}\n"

# ==========================================
# 6. 刷新 Token 测试
# ==========================================
echo -e "${COLORS_YELLOW}[6] 刷新 Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/refresh \
  -b $COOKIES_FILE \
  -c $COOKIES_FILE)

echo "$REFRESH_RESPONSE" | jq .
if echo "$REFRESH_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ Token 刷新成功${NC}\n"
  NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.data.accessToken')
else
  echo -e "${COLORS_RED}❌ Token 刷新失败${NC}\n"
fi

# ==========================================
# 7. 登出测试
# ==========================================
echo -e "${COLORS_YELLOW}[7] 用户登出${NC}"
LOGOUT_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/logout \
  -b $COOKIES_FILE)

echo "$LOGOUT_RESPONSE" | jq .
if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ 登出成功${NC}\n"
else
  echo -e "${COLORS_RED}❌ 登出失败${NC}\n"
fi

# ==========================================
# 8. SQL 查询测试（可选）
# ==========================================
echo -e "${COLORS_YELLOW}[8] SQL 查询测试${NC}"
SQL_RESPONSE=$(curl -s -X POST $API_BASE/api/sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT COUNT(*) as user_count FROM users LIMIT 1",
    "params": []
  }')

echo "$SQL_RESPONSE" | jq .
if echo "$SQL_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ SQL 查询成功${NC}\n"
else
  echo -e "${COLORS_YELLOW}⚠️  SQL 查询失败（可能服务器未启用）${NC}\n"
fi

# ==========================================
# 完成
# ==========================================
echo -e "${COLORS_BLUE}========================================${NC}"
echo -e "${COLORS_BLUE}✅ 测试完成${NC}"
echo -e "${COLORS_BLUE}========================================${NC}"

# 清理
rm -f $COOKIES_FILE
```

### 使用方法

1. **保存脚本**

```bash
cat > test-api.sh << 'EOF'
# （粘贴上面的脚本内容）
EOF
```

2. **执行脚本**

```bash
bash test-api.sh
```

3. **输出示例**

```
========================================
CDesign API 完整测试脚本
========================================

[1] 注册新用户
{
  "success": true,
  "message": "注册成功",
  "data": {
    "message": "注册成功"
  }
}
✅ 注册成功

[2] 用户登录
{
  "success": true,
  "message": "登录成功",
  "data": {
    "message": "登录成功",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "username": "testuser_1234567890"
    }
  }
}
✅ 登录成功
...
```

---

## 最佳实践

### 安全性

1. ✅ **永远使用 HTTPS**
   - 生产环境必须使用 `https://cda.api.zbyblq.xin`
   - 不要在开发后期使用 HTTP

2. ✅ **妥善保管 Token**
   - Access Token 存储在内存中，不要存储在 localStorage
   - Refresh Token 自动在 HttpOnly Cookie 中，更加安全

3. ✅ **定期刷新 Token**
   - 不要等 Token 过期再刷新
   - 建议在距离过期还有 5 分钟时刷新

4. ✅ **实现错误重试**
   - 网络不稳定时，关键操作应该实现重试机制
   - 建议重试 3 次，每次间隔 1-2 秒

### 性能优化

1. ✅ **合理使用流式 API**
   - 长文本生成使用 `/api/ai/ptio/stream`
   - 简短回复使用 `/api/ai/ptio/common`

2. ✅ **缓存用户信息**
   - 登录成功后缓存用户信息
   - 避免频繁调用 `/api/auth/me`

3. ✅ **批量操作**
   - 使用 SQL 接口进行批量查询
   - 减少 API 调用次数

### 调试建议

1. ✅ **使用 jq 解析 JSON**
   ```bash
   curl ... | jq .
   ```

2. ✅ **保存响应用于分析**
   ```bash
   curl ... > response.json
   cat response.json | jq .
   ```

3. ✅ **使用 Postman 进行测试**
   - 导入本文档中的接口定义
   - 自动验证响应格式

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 2.0.0 | 2026-03-16 | 完整重写，添加详细说明和脚本示例 |
| 1.0.0 | 2026-01-01 | 初始版本 |

---

## 联系支持

- 📧 邮件：support@zbyblq.xin
- 📖 文档：https://docs.zbyblq.xin
- 🐛 Bug 报告：https://github.com/BoyangZhang619/CDesign-api/issues

