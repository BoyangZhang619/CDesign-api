/**
 * ⚠️ 已雪藏 — 2026-07-11
 *
 * 原 DashScope/Qwen 直连客户端已停用。所有 LLM 调用已迁移至 sanatura-fastapi
 * (DeepSeek API 网关)。本文件保留仅供历史参考，不应在任何新代码中引用。
 *
 * 新调用路径：aiController / aiChatService → fastapiClient → FastAPI → DeepSeek
 *
 * 如需恢复此文件中的逻辑，请同步更新:
 *   - src/services/fastapiClient.ts
 *   - 各 controller 中的调用方
 */
import OpenAI from 'openai';

const apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY;
const appId = process.env.DASHSCOPE_APP_ID;

if (!apiKey) {
    console.error('❌ 缺少 DASHSCOPE_API_KEY 或 OPENAI_API_KEY 环境变量，AI 功能将不可用');
}

export const openai_compatible = new OpenAI({
    apiKey: apiKey || 'missing-api-key',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

export const openai_app = new OpenAI({
    apiKey: apiKey || 'missing-api-key',
    baseURL: appId
        ? `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`
        : 'https://dashscope.aliyuncs.com/api/v1/apps/missing-app-id/completion'
});