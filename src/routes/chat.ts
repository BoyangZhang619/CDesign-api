import type {Request, Response} from 'express';
import express from 'express';
import {openai} from "../services/openai.js";
import type {ChatCompletionMessageParam} from "openai/resources/chat/completions";
import process from 'process';
import {sendError, sendResult} from '../util/response.js';

const router = express.Router({mergeParams: true});

// ==============================
// 路由分配，放各个路由，函数本体在后面
// ==============================

//ptio -> pure-text-in-text-out | co -> common
router.post('/ptio/common', (req: Request, res: Response): Promise<any> => dealCommonReq(req, res));
//ptio -> pure-text-in-text-out | st -> stream
router.post('/ptio/stream', (req: Request, res: Response) => dealStreamReq(req, res));
//itito -> img-text-in-text-out | co -> common
router.post('/itito/common', (req: Request, res: Response): void => {});
//itito -> img-text-in-text-out | st -> stream
router.post('/itito/stream', (req: Request, res: Response): void => {});

// ==============================
// 函数们，用来处理数据返回数据的
// ==============================

type typeModel = 'qwen3.5-flash' | 'qwen3.5-max';
type typeLanguage = 'Chinese' | 'English' | 'Japanese' | 'French' | 'German';
type typeResTextType = 'text' | 'json' | 'markdown' | 'html';

interface META {
    res: any;
    user_content: string;
    model?: typeModel;
    system_content?: string;
    enable_thinking?: boolean;
    response_language?: typeLanguage;
    response_type?: typeResTextType;
    other?: Record<string, unknown>;
}

async function dealCommonTextReq(meta: META) {
    try {
        if (!meta?.user_content || !meta.user_content.length || !meta?.res) throw new Error("用户输入是空的或res无效，传输或者格式问题 in dealCommonTextReq");
        const formatInstruction = {
            text: '请仅输出纯文本，不要输出 markdown 符号，不要附加解释。',
            json: '请仅输出合法 JSON，不要输出代码块，不要输出额外说明。',
            markdown: '请使用标准 Markdown 输出。',
            html: '请仅输出合法 HTML，不要输出额外说明。'
        }[meta.response_type || 'text'];
        const limit = JSON.stringify({
            language: meta?.response_language || 'Chinese',
            responseTextType: formatInstruction,
        });
        const messages: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: (meta?.system_content || `你是一个极度客观,理性的助手,你需要合理地,友善地帮助、回答或完成接下来的问题或挑战。并且你需要在回答中拒绝使用任何非提及或要求的emoji符号，并且在未要求下不可输出任何特殊格式内容。`) + `\n同时你需要遵守下列json中对应的规则,空或无实意即为默认:\n${limit}`
            },
            {
                role: 'user',
                content: meta.user_content,
            }
        ];
        const completion = await openai.chat.completions.create({
            model: meta?.model || 'qwen3.5-flash',
            messages,
            // @ts-ignore
            extra_body: {
                enable_thinking: meta?.enable_thinking || false,
            },
        });
        const text: string = completion.choices?.[0]?.message?.content ?? '';
        const result = {
            ok: true,
            model: meta?.model || 'qwen3.5-flash',
            content: text
        };
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            ok: false,
            model: meta?.model || 'qwen3.5-flash',
            content: message
        };
    }
}

async function dealCommonReq(req: any, res: any): Promise<any> {
    try {
        const {body} = req;
        if (!body || !body?.message) throw new Error("格式错误，无数据，in dealCommonReq")
        const meta: META = {
            res,
            user_content: body?.message || '请返回对应输出类型的空值',
            model: body?.model || 'qwen3.5-flash',
            system_content: body?.system_content || '',
            enable_thinking: body?.enable_thinking ?? false,
            response_type: body?.response_type || 'text',
            response_language: body?.response_language || 'Chinese',
            other: body?.other || {}
        }
        const result = await dealCommonTextReq(meta);
        if (result.ok) {
            sendResult(res, result);
        } else sendError(res, result.content, 500);

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        sendError(res, message);
    }
}

function dealStreamReq(req, res) {

}


export default router;


// app.post('/chat/stream', async (req, res) => {
//     try {
//         const userMessage = req.body?.message;
//
//         if (!userMessage || typeof userMessage !== 'string') {
//             return res.status(400).json({ error: 'message 必填，且必须是字符串' });
//         }
//
//         const messages: ChatCompletionMessageParam[] = [
//             { role: 'system', content: 'You are a helpful assistant.' },
//             { role: 'user', content: userMessage }
//         ];
//
//         res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
//         res.setHeader('Cache-Control', 'no-cache, no-transform');
//         res.setHeader('Connection', 'keep-alive');
//
//         // @ts-ignore
//         const stream = await openai.chat.completions.create({
//             model: 'qwen3.5-flash',
//             messages,
//             stream: true,
//             extra_body: {
//                 enable_thinking: true
//             }
//         });
//
//         for await (const chunk of stream) {
//             const delta = chunk.choices?.[0]?.delta as ReasoningDelta | undefined;
//             if (!delta) continue;
//
//             if (delta.reasoning_content) {
//                 res.write(`data: ${JSON.stringify({
//                     type: 'reasoning',
//                     content: delta.reasoning_content
//                 })}\n\n`);
//             }
//
//             if (delta.content) {
//                 res.write(`data: ${JSON.stringify({
//                     type: 'content',
//                     content: delta.content
//                 })}\n\n`);
//             }
//         }
//
//         res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
//         res.end();
//     } catch (error: any) {
//         console.error(error);
//         res.write(`data: ${JSON.stringify({
//             type: 'error',
//             error: error?.message || 'server error'
//         })}\n\n`);
//         res.end();
//     }
// });