# CDesign API 文档

## 基础信息

- **基础 URL**: `http://localhost:8080` (开发环境)
- **认证方式**: JWT (Access Token) + Refresh Token (Cookie)
- **跨域配置**: 
  - `http://localhost:5173`
  - `http://localhost:5174`
  - `https://cdw.zbyblq.xin`

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误信息"
}
```

---

## 认证相关接口

### 1. 用户注册

**请求方式**: `POST`  
**路由**: `/api/auth/register`  
**认证**: ❌ 不需要

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "message": "注册成功"
  }
}
```

**响应** (失败):
- `400`: 用户名和密码不能为空
- `400`: 用户已存在
- `500`: 注册失败

---

### 2. 用户登录

**请求方式**: `POST`  
**路由**: `/api/auth/login`  
**认证**: ❌ 不需要

**请求体**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "message": "登录成功",
    "accessToken": "JWT_TOKEN",
    "user": {
      "id": 123,
      "username": "example_user"
    }
  }
}
```

**Cookie**:
- `refreshToken`: 7天有效期的刷新令牌（HttpOnly、Secure、SameSite=lax）

**错误状态码**:
- `400`: 用户名和密码不能为空
- `400`: 用户不存在
- `400`: 密码错误
- `500`: 登录失败

---

### 3. 刷新 Token

**请求方式**: `POST`  
**路由**: `/api/auth/refresh`  
**认证**: ❌ 不需要（使用 Cookie 中的 refreshToken）

**请求体**: 无

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "accessToken": "NEW_JWT_TOKEN",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "credits": 1000
    }
  }
}
```

**Cookie**:
- `refreshToken`: 新的刷新令牌（自动更新）

**功能说明**:
- Token 轮换：作废旧 refresh token，生成新的
- 返回新的 access token

**错误状态码**:
- `401`: 缺少 refresh token
- `401`: 无效的 refresh token
- `401`: refresh token 不存在
- `401`: refresh token 已失效
- `401`: 用户不存在
- `500`: 刷新失败

---

### 4. 获取当前用户信息

**请求方式**: `GET`  
**路由**: `/api/auth/me`  
**认证**: ✅ 需要 (Authorization: Bearer {accessToken})

**请求体**: 无

**响应** (成功):
```json
{
  "success": true,
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

**错误状态码**:
- `404`: 用户不存在
- `500`: 获取用户信息失败

---

### 5. 单设备登出

**请求方式**: `POST`  
**路由**: `/api/auth/logout`  
**认证**: ❌ 不需要

**请求体**: 无

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "message": "退出成功"
  }
}
```

**功能说明**:
- 删除当前 refresh token 记录
- 清除 refreshToken Cookie

**错误状态码**:
- `500`: 退出失败

---

### 6. 全设备登出

**请求方式**: `POST`  
**路由**: `/api/auth/logout-all`  
**认证**: ✅ 需要 (Authorization: Bearer {accessToken})

**请求体**: 无

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "message": "已退出所有设备"
  }
}
```

**功能说明**:
- 撤销该用户在所有设备上的所有 refresh token
- 可用于"修改密码后全部设备失效"

**错误状态码**:
- `500`: 操作失败

---

## AI 相关接口

### 1. 普通对话

**请求方式**: `POST`  
**路由**: `/api/ai/ptio/common`  
**认证**: ✅ 需要 (Authorization: Bearer {accessToken})

**请求体**:
```json
{
  "message": "string",                    // 必需：用户输入
  "model": "qwen3.5-flash",              // 可选：模型选择 (qwen3.5-flash | qwen3.5-max)
  "system_content": "string",            // 可选：系统提示词
  "enable_thinking": false,              // 可选：启用思考过程 (默认: false)
  "response_type": "text",               // 可选：响应类型 (text | json_object)
  "response_language": "Chinese",        // 可选：响应语言 (Chinese | English | Japanese | French | German)
  "other": {}                            // 可选：其他参数
}
```

**响应** (成功):
```json
{
  "success": true,
  "data": {
    "ok": true,
    "model": "qwen3.5-flash",
    "content": "响应内容",
    "usage": {
      "total_tokens": 150
    }
  }
}
```

**费用说明**:
- 消耗用户 token 额度（usage.total_tokens）
- 不同模型的消耗可能不同

**错误状态码**:
- `401`: 未授权或用户信息无效
- `404`: 用户不存在
- `403`: 额度不足
- `500`: 请求失败

---

### 2. 流式对话

**请求方式**: `POST`  
**路由**: `/api/ai/ptio/stream`  
**认证**: ✅ 需要 (Authorization: Bearer {accessToken})

**请求体**:
```json
{
  "message": "string",                    // 必需：用户输入
  "model": "qwen3.5-flash",              // 可选：模型选择 (qwen3.5-flash | qwen3.5-max)
  "system_content": "string",            // 可选：系统提示词
  "enable_thinking": false,              // 可选：启用思考过程 (默认: false)
  "response_type": "text",               // 可选：响应类型 (text | json_object)
  "response_language": "Chinese",        // 可选：响应语言 (Chinese | English | Japanese | French | German)
  "other": {}                            // 可选：其他参数
}
```

**响应** (SSE 流式):
```
data: {"type":"reasoning","content":"思考内容..."}

data: {"type":"content","content":"回复内容..."}

data: {"type":"done","usage":{"total_tokens":200}}
```

**流消息类型**:
| 类型 | 说明 | 示例 |
|------|------|------|
| `reasoning` | 模型的思考过程 | `{"type":"reasoning","content":"..."}` |
| `content` | 实际响应内容 | `{"type":"content","content":"..."}` |
| `done` | 流传输完成 | `{"type":"done","usage":{"total_tokens":200}}` |
| `error` | 错误信息 | `{"type":"error","content":"error message"}` |

**费用说明**:
- 消耗用户 token 额度（usage.total_tokens）
- 流式传输完成后扣费

**错误状态码**:
- `401`: 未授权或用户信息无效
- `404`: 用户不存在
- `403`: 额度不足
- `500`: 请求失败

---

## 数据库查询接口

### 执行自定义 SQL 查询

**请求方式**: `POST`  
**路由**: `/api/sql`  
**认证**: ❌ 不需要（建议添加认证）

**请求体**:
```json
{
  "sql": "SELECT * FROM users WHERE id = ?",
  "params": [123]
}
```

**响应** (成功):
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "username": "example_user"
    }
  ]
}
```

**错误状态码**:
- `400`: POST 请求无数据
- `400`: POST 请求 sql 语句为空
- `500`: SQL 执行失败

---

## 请求示例

### 使用 cURL 注册用户
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

### 使用 cURL 登录
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }' \
  -c cookies.txt
```

### 使用 cURL 调用 AI 普通对话
```bash
curl -X POST http://localhost:8080/api/ai/ptio/common \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "你好",
    "model": "qwen3.5-flash",
    "response_language": "Chinese"
  }'
```

### 使用 JavaScript 获取流式对话
```javascript
const response = await fetch('http://localhost:8080/api/ai/ptio/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    message: 'Please explain quantum computing',
    model: 'qwen3.5-max',
    response_language: 'English'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const text = decoder.decode(value);
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const message = JSON.parse(line.slice(6));
      console.log(message);
    }
  }
}
```

---

## 错误处理

### 认证错误 (401)
```json
{
  "success": false,
  "error": "无效的 refresh token"
}
```

### 参数错误 (400)
```json
{
  "success": false,
  "error": "用户名和密码不能为空"
}
```

### 服务器错误 (500)
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 安全建议

1. **Access Token** - 建议存储在内存中，不要存储在 localStorage
2. **Refresh Token** - 自动存储在 HttpOnly Cookie 中，无需手动处理
3. **HTTPS** - 生产环境必须使用 HTTPS
4. **CORS** - 已配置允许的来源，不要在生产环境中使用 `*`
5. **SQL 注入** - `/api/sql` 接口使用参数化查询，但建议添加认证保护

---

## 环境变量需求

- `NODE_ENV`: 环境标识 (development | production)
- `PORT`: 服务器端口 (默认: 8080)
- 数据库配置（通过 `src/config/db.ts`）
- OpenAI/Qwen 配置（通过 `src/services/openai.ts`）
