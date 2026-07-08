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