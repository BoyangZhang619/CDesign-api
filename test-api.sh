#!/bin/bash

# ==========================================
# CDesign API 完整测试脚本
# ==========================================
# 使用方法: bash test-api.sh
# 依赖: curl, jq

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
echo -e "${COLORS_BLUE}API 地址: $API_BASE${NC}"
echo -e "${COLORS_BLUE}========================================${NC}\n"

# ==========================================
# 1. 注册测试
# ==========================================
echo -e "${COLORS_YELLOW}[1] 注册新用户${NC}"
TIMESTAMP=$(date +%s)
TEST_USERNAME="testuser_$TIMESTAMP"
TEST_PASSWORD="password123"

REGISTER_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "'$TEST_USERNAME'",
    "password": "'$TEST_PASSWORD'"
  }')

echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"
if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ 注册成功${NC}\n"
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
    "username": "'$TEST_USERNAME'",
    "password": "'$TEST_PASSWORD'"
  }')

echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
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

echo "$ME_RESPONSE" | jq . 2>/dev/null || echo "$ME_RESPONSE"
if echo "$ME_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ 获取用户信息成功${NC}\n"
  USER_ID=$(echo "$ME_RESPONSE" | jq -r '.data.user.id')
  USER_CREDITS=$(echo "$ME_RESPONSE" | jq -r '.data.user.credits // 0')
  echo "👤 用户 ID: $USER_ID"
  echo "💰 用户额度: $USER_CREDITS\n"
else
  echo -e "${COLORS_RED}❌ 获取用户信息失败${NC}\n"
  USER_CREDITS=0
fi

# ==========================================
# 4. AI 普通对话测试
# ==========================================
echo -e "${COLORS_YELLOW}[4] AI 普通对话${NC}"

if [ "$USER_CREDITS" -gt 100 ]; then
  echo "📝 发送消息: '你好，请用一句话介绍你自己'"
  AI_RESPONSE=$(curl -s -X POST $API_BASE/api/ai/ptio/common \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
      "message": "你好，请用一句话介绍你自己",
      "model": "qwen3.5-flash",
      "response_language": "Chinese"
    }')

  echo "$AI_RESPONSE" | jq . 2>/dev/null || echo "$AI_RESPONSE"
  if echo "$AI_RESPONSE" | grep -q '"success":true'; then
    echo -e "${COLORS_GREEN}✅ AI 对话成功${NC}\n"
    TOKENS_USED=$(echo "$AI_RESPONSE" | jq -r '.data.usage.total_tokens')
    AI_CONTENT=$(echo "$AI_RESPONSE" | jq -r '.data.content')
    echo "🤖 AI 回复: $AI_CONTENT"
    echo "📊 本次消耗 tokens: $TOKENS_USED\n"
  else
    echo -e "${COLORS_RED}❌ AI 对话失败${NC}\n"
  fi
else
  echo -e "${COLORS_YELLOW}⚠️  用户额度 ($USER_CREDITS) 不足，跳过 AI 对话测试${NC}\n"
fi

# ==========================================
# 5. AI 流式对话测试
# ==========================================
echo -e "${COLORS_YELLOW}[5] AI 流式对话${NC}"

if [ "$USER_CREDITS" -gt 100 ]; then
  echo "📝 发送消息: '用三个词描述人工智能'"
  echo -e "${COLORS_BLUE}流式响应内容:${NC}"
  
  curl -s -X POST $API_BASE/api/ai/ptio/stream \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{
      "message": "用三个词描述人工智能",
      "model": "qwen3.5-flash",
      "response_language": "Chinese"
    }' | while IFS= read -r line; do
    if [[ $line == data:* ]]; then
      JSON_DATA=$(echo "$line" | sed 's/^data: //')
      TYPE=$(echo "$JSON_DATA" | jq -r '.type // "unknown"' 2>/dev/null)
      CONTENT=$(echo "$JSON_DATA" | jq -r '.content // ""' 2>/dev/null)
      
      case "$TYPE" in
        "reasoning")
          echo -e "${COLORS_YELLOW}🤔 思考:${NC} $CONTENT"
          ;;
        "content")
          echo -n "$CONTENT"
          ;;
        "done")
          USAGE=$(echo "$JSON_DATA" | jq -r '.usage.total_tokens // 0' 2>/dev/null)
          echo ""
          echo -e "\n${COLORS_GREEN}✅ 流式对话完成，消耗 $USAGE tokens${NC}\n"
          ;;
        "error")
          echo -e "${COLORS_RED}❌ 错误:${NC} $CONTENT\n"
          ;;
      esac
    fi
  done
else
  echo -e "${COLORS_YELLOW}⚠️  用户额度不足，跳过流式对话测试${NC}\n"
fi

# ==========================================
# 6. 刷新 Token 测试
# ==========================================
echo -e "${COLORS_YELLOW}[6] 刷新 Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST $API_BASE/api/auth/refresh \
  -b $COOKIES_FILE \
  -c $COOKIES_FILE)

echo "$REFRESH_RESPONSE" | jq . 2>/dev/null || echo "$REFRESH_RESPONSE"
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

echo "$LOGOUT_RESPONSE" | jq . 2>/dev/null || echo "$LOGOUT_RESPONSE"
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

echo "$SQL_RESPONSE" | jq . 2>/dev/null || echo "$SQL_RESPONSE"
if echo "$SQL_RESPONSE" | grep -q '"success":true'; then
  echo -e "${COLORS_GREEN}✅ SQL 查询成功${NC}\n"
  USER_COUNT=$(echo "$SQL_RESPONSE" | jq -r '.data[0].user_count // 0')
  echo "📊 数据库用户总数: $USER_COUNT\n"
else
  echo -e "${COLORS_YELLOW}⚠️  SQL 查询失败（服务器可能未启用此接口）${NC}\n"
fi

# ==========================================
# 完成
# ==========================================
echo -e "${COLORS_BLUE}========================================${NC}"
echo -e "${COLORS_BLUE}✅ 测试完成${NC}"
echo -e "${COLORS_BLUE}========================================${NC}"
echo ""
echo "📝 测试用户: $TEST_USERNAME"
echo "🔐 测试密码: $TEST_PASSWORD"
echo ""

# 清理
rm -f $COOKIES_FILE

echo "✨ 所有临时文件已清理"
