#!/bin/bash

# AI Chat API 验证脚本
# 用于测试所有 API 端点

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
BASE_URL="${BASE_URL:-http://localhost:8080}"
API_BASE="$BASE_URL/api/ai-chat"
TOKEN="${TOKEN:-your-bearer-token}"

# 计数器
PASSED=0
FAILED=0

# 打印帮助信息
print_help() {
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  -t, --token <TOKEN>    设置认证 Token"
    echo "  -u, --url <URL>        设置基础 URL (默认: http://localhost:8080)"
    echo "  -h, --help             显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 -t your-token -u http://localhost:8080"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--token)
            TOKEN="$2"
            shift 2
            ;;
        -u|--url)
            API_BASE="$2/api/ai-chat"
            shift 2
            ;;
        -h|--help)
            print_help
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            print_help
            exit 1
            ;;
    esac
done

# 测试函数
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_code=$4
    local description=$5

    printf "${BLUE}测试:${NC} %s\n" "$description"
    
    local url="$API_BASE$endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" == "$expected_code" ] || [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
        printf "${GREEN}✓ 通过${NC} (HTTP $http_code)\n\n"
        PASSED=$((PASSED + 1))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        echo ""
        return 0
    else
        printf "${RED}✗ 失败${NC} (HTTP $http_code)\n"
        printf "${RED}响应:${NC}\n%s\n\n" "$body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# 主要测试流程
main() {
    echo "================================================"
    echo "    AI Chat API 集成测试"
    echo "================================================"
    echo ""
    printf "基础 URL: ${BLUE}%s${NC}\n" "$API_BASE"
    printf "认证 Token: ${BLUE}%s...${NC}\n" "${TOKEN:0:20}"
    echo ""
    
    # 1. 创建会话
    echo "======== 会话管理测试 ========"
    echo ""
    
    test_endpoint "POST" "/sessions" \
        '{"session_name": "API测试会话", "system_prompt": "你是一个助手", "ai_model": "dashscope", "temperature": 0.7}' \
        "201" \
        "创建新会话"
    
    # 从响应中提取会话 ID
    SESSION_ID=$(curl -s -X POST "$API_BASE/sessions" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"session_name": "测试", "ai_model": "dashscope"}' | jq -r '.data.id')
    
    if [ "$SESSION_ID" == "null" ] || [ -z "$SESSION_ID" ]; then
        echo "${RED}错误: 无法创建会话${NC}"
        FAILED=$((FAILED + 1))
        SESSION_ID=1 # 使用默认值继续测试
    fi
    
    printf "使用会话 ID: ${BLUE}%s${NC}\n\n" "$SESSION_ID"
    
    # 2. 获取所有会话
    test_endpoint "GET" "/sessions" \
        "" \
        "200" \
        "获取所有会话"
    
    # 3. 获取单个会话
    test_endpoint "GET" "/sessions/$SESSION_ID" \
        "" \
        "200" \
        "获取会话详情"
    
    # 4. 更新会话
    test_endpoint "PUT" "/sessions/$SESSION_ID" \
        '{"session_name": "更新的会话名称", "temperature": 0.8}' \
        "200" \
        "更新会话"
    
    # 5. 标记星标
    test_endpoint "POST" "/sessions/$SESSION_ID/star" \
        "" \
        "200" \
        "切换会话星标"
    
    echo ""
    echo "======== 消息管理测试 ========"
    echo ""
    
    # 6. 发送消息
    test_endpoint "POST" "/sessions/$SESSION_ID/messages" \
        '{"content": "你好，请介绍一下你自己"}' \
        "200" \
        "发送消息并获取 AI 响应"
    
    # 从消息响应中提取消息 ID（这里简化处理）
    MESSAGE_ID=1
    
    # 7. 获取聊天历史
    test_endpoint "GET" "/sessions/$SESSION_ID/messages" \
        "" \
        "200" \
        "获取聊天历史"
    
    # 8. 编辑消息（可选，需要有效的消息 ID）
    test_endpoint "PATCH" "/messages/$MESSAGE_ID" \
        '{"content": "编辑后的消息"}' \
        "200" \
        "编辑消息" || true
    
    echo ""
    echo "======== 搜索和统计测试 ========"
    echo ""
    
    # 9. 搜索消息
    test_endpoint "GET" "/search?keyword=助手" \
        "" \
        "200" \
        "搜索消息"
    
    # 10. Token 统计
    test_endpoint "GET" "/stats" \
        "" \
        "200" \
        "获取 Token 统计"
    
    echo ""
    echo "======== 会话清理测试 ========"
    echo ""
    
    # 11. 清空会话（需谨慎）
    # test_endpoint "DELETE" "/sessions/$SESSION_ID/clear" \
    #     "" \
    #     "200" \
    #     "清空会话消息"
    
    echo "${YELLOW}注意: 清空会话测试被跳过以保护数据${NC}"
    echo ""
    
    # 结果总结
    echo "================================================"
    echo "测试结果总结"
    echo "================================================"
    printf "${GREEN}通过:${NC} %d\n" "$PASSED"
    printf "${RED}失败:${NC} %d\n" "$FAILED"
    printf "总计: %d\n" "$((PASSED + FAILED))"
    echo ""
    
    if [ $FAILED -eq 0 ]; then
        printf "${GREEN}✓ 所有测试通过!${NC}\n"
        return 0
    else
        printf "${RED}✗ 有 %d 个测试失败${NC}\n" "$FAILED"
        return 1
    fi
}

# 健康检查
check_health() {
    printf "检查服务器健康状态... "
    
    if curl -s "$BASE_URL" > /dev/null 2>&1; then
        printf "${GREEN}✓ 服务器运行中${NC}\n"
        return 0
    else
        printf "${RED}✗ 无法连接到服务器${NC}\n"
        printf "${YELLOW}请确保:${NC}\n"
        printf "  1. 服务器在运行 (npm start)\n"
        printf "  2. 使用正确的 URL (默认: http://localhost:8080)\n"
        return 1
    fi
}

# 检查依赖
check_deps() {
    if ! command -v curl &> /dev/null; then
        echo "${RED}错误: curl 未安装${NC}"
        return 1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo "${YELLOW}警告: jq 未安装，某些功能可能受限${NC}"
    fi
    
    return 0
}

# 运行测试
if check_deps && check_health; then
    main
else
    exit 1
fi
