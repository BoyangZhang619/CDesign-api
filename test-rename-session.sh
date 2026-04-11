#!/bin/bash

# 测试对话名称更新功能
# 需要以下步骤：
# 1. 创建新会话
# 2. 获取会话列表
# 3. 更新会话名称
# 4. 验证更新结果

API_URL="http://localhost:8000/api/ai-chat"
TOKEN="your-jwt-token-here"  # 需要替换为实际的 JWT Token

echo "========================================"
echo "测试对话名称更新功能"
echo "========================================"

# 1. 创建新会话
echo ""
echo "1. 创建新会话..."
CREATE_RESPONSE=$(curl -s -X POST "$API_URL/sessions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "session_name": "测试对话",
    "system_prompt": "你是一个有帮助的助手",
    "ai_model": "dashscope"
  }')

echo "创建会话响应:"
echo $CREATE_RESPONSE | jq .

# 提取会话 ID
SESSION_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')
echo "会话 ID: $SESSION_ID"

# 2. 获取会话列表
echo ""
echo "2. 获取会话列表..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/sessions" \
  -H "Authorization: Bearer $TOKEN")

echo "会话列表:"
echo $GET_RESPONSE | jq .

# 3. 更新会话名称
echo ""
echo "3. 更新会话名称..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "session_name": "更新后的对话名称"
  }')

echo "更新会话响应:"
echo $UPDATE_RESPONSE | jq .

# 4. 验证更新结果
echo ""
echo "4. 验证更新结果..."
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "验证会话详情:"
echo $VERIFY_RESPONSE | jq .

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"
