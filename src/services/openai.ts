import OpenAI from 'openai';

export const openai_compatible = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY ?? process.env.OPENAI_API_KEY ?? 'sk-24ab4066c67e41738fc543b502cf39da',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});
export const openai_app = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY ?? process.env.OPENAI_API_KEY ?? 'sk-24ab4066c67e41738fc543b502cf39da',
    baseURL: 'https://dashscope.aliyuncs.com/api/v1/apps/49200fbe087f4b1882b9a44ef9c91ef8/completion'
});
// 使用纯模型接口使用：
// POST https://dashscope.aliyuncs.com/compatible-mode/v1/completions
// 使用应用接口使用：
// POST https://dashscope.aliyuncs.com/api/v1/apps/49200fbe087f4b1882b9a44ef9c91ef8/completion