import OpenAI from 'openai';

export const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY ?? process.env.OPENAI_API_KEY ?? 'sk-24ab4066c67e41738fc543b502cf39da',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});