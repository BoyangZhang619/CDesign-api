#!/bin/bash

# 测试 portrait 刷新端点
# 假设已有有效的 JWT token

API_URL="http://localhost:3000"
USER_ID=1

# 测试用的 token（需要替换为实际的 token）
TOKEN="your_jwt_token_here"

echo "========================================"
echo "测试 Portrait 刷新端点"
echo "========================================"

# 1. 首先获取当前的画像数据
echo -e "\n1. 获取当前画像数据..."
curl -X GET "$API_URL/api/health/portrait" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# 2. 检查健康档案设置状态
echo -e "\n\n2. 检查健康档案设置状态..."
curl -X GET "$API_URL/api/health/setup-status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# 3. 调用刷新端点（触发 aiChat 分析）
echo -e "\n\n3. 触发从 checkin 刷新画像..."
curl -X POST "$API_URL/api/health/refresh-from-checkin" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# 4. 再次获取画像数据验证是否更新
echo -e "\n\n4. 再次获取画像数据（验证更新）..."
curl -X GET "$API_URL/api/health/portrait" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

echo -e "\n========================================"
echo "测试完成"
echo "========================================"
