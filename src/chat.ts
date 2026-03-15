import * as dotenv from 'dotenv';
import express from 'express';
import OpenAI from "openai";
import cors from 'cors';
import type {ChatCompletionMessageParam} from "openai/resources/chat/completions";
import process from 'process';
import {sendResult, sendError} from './response.js';

const router = express.Router({mergeParams: true});
router.use(cors());
router.use(express.json())
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY, // 从环境变量读取
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
});

// ==============================
// 路由分配，放各个路由，函数本体在后面
// ==============================

router.post('/', (req, res) => dealCommonReq(req, res));

router.post('/stream/', (req, res) => dealStreamReq(req, res));


// ==============================
// 函数们，用来处理数据返回数据的
// ==============================

async function dealCommonReq(req: any, res: any): Promise<any> {
    try {
        const userMessage = req?.body?.message;
        if (!userMessage || typeof userMessage !== 'string') {
            sendError(res, "request.body.message无数据或无效");
        }
        const limit: Object = req.body?.object || {};
        const messages: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: `你是一个极度客观,理性的助手,你需要合理地,友善地帮助、回答或完成接下来的问题或挑战。\n同时你需要遵守下列json中对应的规则,空或无实意则默认。${limit}`
            },
            {role: 'user', content: userMessage}
        ];
        const enable_thinking: boolean = req.body?.enable_thinking || false;
        const completion = await openai.chat.completions.create({
            model: 'qwen3.5-flash',
            messages,
            // @ts-ignore
            extra_body: {
                enable_thinking
            }
        });
        const text: string = completion.choices?.[0]?.message?.content ?? '';
        const result = {
            ok: true,
            model: completion.model,
            content: text,
            raw: completion
        };
        return sendResult(res, result);
    } catch (error) {
        console.error(error.message);
        sendError(res, error.message);
    }
}

function dealStreamReq(req, res) {

}

export default router;