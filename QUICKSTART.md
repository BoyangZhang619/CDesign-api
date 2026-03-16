# 🚀 快速开始指南

## 📌 5 分钟快速上手

### 第 1 步：注册账户

```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "myuser",
    "password": "mypassword123"
  }'
```

### 第 2 步：登录获取 Token

```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "myuser",
    "password": "mypassword123"
  }'
```

从响应中复制 `accessToken` 的值

### 第 3 步：调用 API

```bash
# 获取用户信息
curl -X GET https://cda.api.zbyblq.xin/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# 调用 AI 接口
curl -X POST https://cda.api.zbyblq.xin/api/ai/ptio/common \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "你好"
  }'
```

---

## 📚 完整文档

- **API.md** - 详细的接口文档
- **CURL_REFERENCE.md** - curl 命令快速参考
- **test-api.sh** - 完整的自动化测试脚本

---

## 🔑 核心概念

### 认证流程

```
1. 注册 (POST /api/auth/register)
   ↓
2. 登录 (POST /api/auth/login)
   ↓ 获得 accessToken 和 refreshToken (cookie)
   ↓
3. 使用 accessToken 调用其他 API
   ↓
4. Token 过期时，使用 refreshToken 刷新 (POST /api/auth/refresh)
   ↓
5. 登出 (POST /api/auth/logout)
```

### Token 说明

| Token | 存储位置 | 有效期 | 说明 |
|-------|---------|--------|------|
| Access Token | 响应体 | 15 分钟 | 用于调用受保护的 API |
| Refresh Token | HttpOnly Cookie | 7 天 | 用于刷新过期的 Access Token |

### 请求格式

所有请求都需要以下 Header：

```bash
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN  # 仅受保护的 API 需要
```

---

## 💡 常见问题

### Q: 为什么出现 401 错误？

A: Token 无效或过期。解决方案：
1. 确保 Token 正确：`Authorization: Bearer YOUR_TOKEN`
2. 使用 `/api/auth/refresh` 刷新 Token
3. 如果还是失败，重新登录

### Q: 为什么出现 403 错误？

A: 用户额度不足。解决方案：
1. 检查额度：`GET /api/auth/me`
2. 联系管理员充值
3. 使用消耗更少 token 的模型

### Q: 如何在脚本中自动处理 Token 刷新？

A: 参考 `test-api.sh` 中的实现，或自己编写：

```bash
#!/bin/bash

# 登录
TOKEN=$(curl -s -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"username":"user","password":"pass"}' | \
  jq -r '.data.accessToken')

# 使用 TOKEN
curl -X GET https://cda.api.zbyblq.xin/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Token 过期后刷新
curl -X POST https://cda.api.zbyblq.xin/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### Q: 流式 API 和普通 API 有什么区别？

A: 
- **普通 API** (`/api/ai/ptio/common`) - 一次性返回完整响应
- **流式 API** (`/api/ai/ptio/stream`) - 实时逐字返回响应

选择：
- 短文本：使用普通 API
- 长文本或实时显示：使用流式 API

---

## 🛠️ 开发建议

### 使用 Postman

1. 导入 Postman Collection
2. 设置全局变量：`base_url`, `token`
3. 自动化测试和调试

### 使用脚本

运行完整测试脚本：

```bash
bash test-api.sh
```

### 使用代码库

集成到你的项目中：

```javascript
// JavaScript 示例
const API_BASE = 'https://cda.api.zbyblq.xin';

// 登录
async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // 自动发送 cookies
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

// 调用 API
async function callAPI(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return res.json();
}

// 流式 API
async function streamAPI(message, token) {
  const res = await fetch(`${API_BASE}/api/ai/ptio/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const text = decoder.decode(value);
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const msg = JSON.parse(line.slice(6));
        console.log(msg);
      }
    }
  }
}
```

```python
# Python 示例
import requests
import json

API_BASE = 'https://cda.api.zbyblq.xin'

# 登录
def login(username, password):
    res = requests.post(f'{API_BASE}/api/auth/login', json={
        'username': username,
        'password': password
    })
    return res.json()

# 调用 API
def call_api(path, token):
    headers = {'Authorization': f'Bearer {token}'}
    res = requests.get(f'{API_BASE}{path}', headers=headers)
    return res.json()

# 流式 API
def stream_api(message, token):
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    data = {'message': message}
    
    with requests.post(f'{API_BASE}/api/ai/ptio/stream', 
                      headers=headers, json=data, stream=True) as res:
        for line in res.iter_lines():
            if line.startswith(b'data: '):
                msg = json.loads(line[6:])
                print(msg)
```

---

## 📋 清单

在开始开发前，确保你已经：

- [ ] 阅读 API.md 文档
- [ ] 运行 test-api.sh 测试脚本
- [ ] 成功注册并登录账户
- [ ] 调用过至少一个 API 接口
- [ ] 理解 Token 的认证流程
- [ ] 了解错误处理方式

---

## 🎯 下一步

1. **开发前端** - 集成登录、Token 管理、API 调用
2. **开发后端** - 集成 API 调用，处理 Token 刷新
3. **生产部署** - 使用 HTTPS、设置合理的超时时间、实现重试机制
4. **性能优化** - 缓存用户信息、使用流式 API、批量操作

---

## 📞 联系方式

- 📧 Email: support@zbyblq.xin
- 📖 Docs: https://docs.zbyblq.xin
- 🐛 Issues: https://github.com/BoyangZhang619/CDesign-api/issues

---

最后更新：2026-03-16
