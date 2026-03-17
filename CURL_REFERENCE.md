# CDesign API - curl 快速参考

## 服务器地址
```
https://cda.api.zbyblq.xin
```

## 认证接口

### 1. 注册
```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. 登录（保存 cookies）
```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**提取 accessToken：**
```bash
curl -s -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' | \
  jq -r '.data.accessToken'
```

### 3. 获取用户信息
```bash
curl -X GET https://cda.api.zbyblq.xin/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. 刷新 Token
```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt
```

### 5. 单设备登出
```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/logout \
  -b cookies.txt
```

### 6. 全设备登出
```bash
curl -X POST https://cda.api.zbyblq.xin/api/auth/logout-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## AI 接口

### 1. 普通对话
```bash
curl -X POST https://cda.api.zbyblq.xin/api/ai/ptio/common \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "你好",
    "model": "qwen3.5-flash",
    "response_language": "Chinese"
  }'
```

### 2. 流式对话
```bash
curl -X POST https://cda.api.zbyblq.xin/api/ai/ptio/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "写一个快排算法",
    "model": "qwen3.5-max",
    "response_language": "Chinese"
  }'
```

---

## 数据库接口

### 执行 SQL 查询
```bash
curl -X POST https://cda.api.zbyblq.xin/api/sql \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT COUNT(*) as count FROM users",
    "params": []
  }'
```

---

## 完整工作流脚本

### 保存为 `workflow.sh`

```bash
#!/bin/bash

API="https://cda.api.zbyblq.xin"

# 1. 登录
echo "登录..."
LOGIN=$(curl -s -X POST $API/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "testuser",
    "password": "password123"
  }')

TOKEN=$(echo $LOGIN | jq -r '.data.accessToken')
echo "Token: $TOKEN"

# 2. 获取用户信息
echo -e "\n获取用户信息..."
curl -s -X GET $API/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. 普通对话
echo -e "\n普通对话..."
curl -s -X POST $API/api/ai/ptio/common \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "今天天气怎样",
    "model": "qwen3.5-flash"
  }' | jq .

# 4. 刷新 Token
echo -e "\n刷新 Token..."
curl -s -X POST $API/api/auth/refresh \
  -b cookies.txt \
  -c cookies.txt | jq .

# 5. 登出
echo -e "\n登出..."
curl -s -X POST $API/api/auth/logout \
  -b cookies.txt | jq .

# 清理
rm -f cookies.txt
```

### 运行
```bash
bash workflow.sh
```

---

## 常用技巧

### 1. 格式化输出
```bash
curl -s ... | jq .
curl -s ... | jq '.data.user'
```

### 2. 提取特定字段
```bash
curl -s ... | jq -r '.data.accessToken'  # 提取 token
curl -s ... | jq '.data.user | keys'     # 获取所有键
```

### 3. 保存和使用 Cookies
```bash
# 登录时保存 cookies
curl -X POST ... -c cookies.txt

# 使用保存的 cookies
curl -X POST ... -b cookies.txt

# 覆盖 cookies
curl -X POST ... -c cookies.txt
```

### 4. 设置超时
```bash
curl --max-time 10 ...  # 10 秒超时
curl --connect-timeout 5 ...  # 连接超时 5 秒
```

### 5. 显示响应头
```bash
curl -i ...  # 显示响应头 + 响应体
curl -I ...  # 只显示响应头
```

### 6. 调试模式
```bash
curl -v ...     # 详细输出
curl -X POST ... -H "Content-Type: application/json" -d @body.json  # 从文件读取 body
```

---

## 环境变量使用

### 设置环境变量
```bash
export API="https://cda.api.zbyblq.xin"
export TOKEN="your_access_token"
export EMAIL="user@example.com"
export PASSWORD="password123"
```

### 在 curl 中使用
```bash
curl -X GET $API/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## 一行命令示例

### 登录并获取 token
```bash
curl -s -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' | jq -r '.data.accessToken'
```

### 直接使用 token 调用 API
```bash
TOKEN=$(curl -s -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' | jq -r '.data.accessToken') && \
curl -X GET https://cda.api.zbyblq.xin/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 快速注册并登录
```bash
EMAIL="user_$(date +%s)@example.com" && \
curl -s -X POST https://cda.api.zbyblq.xin/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123\"}" && \
curl -s -X POST https://cda.api.zbyblq.xin/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123\"}" | jq .
```

---

## 故障排除

### 问题: CORS 错误
**原因**: 请求来源不在白名单中
**解决**: 确保前端域名在配置中
```
允许的域名:
- https://cdw.zbyblq.xin
- http://localhost:5173
- http://localhost:5174
```

### 问题: 401 Unauthorized
**原因**: Token 无效或过期
**解决**: 
1. 检查 Token 格式：`Authorization: Bearer YOUR_TOKEN`
2. 使用 `/api/auth/refresh` 刷新 Token
3. 重新登录获取新 Token

### 问题: 403 Forbidden
**原因**: 用户额度不足
**解决**: 
1. 检查用户额度：`GET /api/auth/me`
2. 使用消耗更少 token 的模型：`qwen3.5-flash`
3. 联系管理员充值

### 问题: 500 Internal Server Error
**原因**: 服务器错误
**解决**:
1. 检查服务器是否在线
2. 查看服务器日志
3. 重试请求
4. 联系技术支持

---

## Postman 导入

### 创建 Postman 集合

1. 打开 Postman
2. 创建新的 Collection
3. 设置集合变量：
   - `base_url`: `https://cda.api.zbyblq.xin`
   - `token`: （运行登录后自动填充）

4. 导入请求：

**注册请求**
```
POST {{base_url}}/api/auth/register
Body (raw JSON):
{
  "email": "user_{{$timestamp}}@example.com",
  "password": "password123"
}
```

**登录请求**
```
POST {{base_url}}/api/auth/login
Body (raw JSON):
{
  "email": "user@example.com",
  "password": "password123"
}

Tests (自动提取 token):
var jsonData = pm.response.json();
pm.environment.set("token", jsonData.data.accessToken);
```

**API 请求**
```
GET {{base_url}}/api/auth/me
Headers:
Authorization: Bearer {{token}}
```

---

## 更新日期
2026-03-16
