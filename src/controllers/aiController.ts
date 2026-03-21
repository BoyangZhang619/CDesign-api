import pool from '../config/db.js';
import type { Request, Response } from 'express';
import { sendError, sendResult } from '../util/response.js';
import { openai } from "../services/openai.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getUserIdFromReq, getUserById } from './sharedMethods.js';

type ModelType = 'qwen3.5-flash' | 'qwen3.5-plus';
type LanguageType = 'Chinese' | 'English' | 'Japanese' | 'French' | 'German';
type ResponseTextType = 'text' | 'json_object';

interface META {
    user_content: string;
    model?: ModelType;
    system_content?: string;
    enable_thinking?: boolean;
    response_language?: LanguageType;
    response_type?: ResponseTextType;
    other?: Record<string, unknown>;
}

interface ChatResult {
    ok: boolean;
    model: ModelType;
    content: string;
    usage: {
        total_tokens: number;
    };
}



function buildMessages(meta: META): ChatCompletionMessageParam[] {
    const formatInstructionMap: Record<ResponseTextType, string> = {
        text: '请仅输出纯文本，不要输出 markdown 符号，不要附加解释。',
        json_object: '请仅输出合法 JSON，不要输出代码块，不要输出额外说明。'
    };

    const limit = JSON.stringify({
        language: meta.response_language || 'Chinese',
        responseTextType: formatInstructionMap[meta.response_type || 'text'],
    });

    return [
        {
            role: 'system',
            content:
                (meta.system_content ||
                    '你是一个极度客观,理性的助手,你需要合理地,友善地帮助、回答或完成接下来的问题或挑战。并且你需要在回答中拒绝使用任何非提及或要求的emoji符号，并且在未要求下不可输出任何特殊格式内容。'
                ) + `\n同时你需要遵守下列json中对应的规则,空或无实意即为默认:\n${limit}`
        },
        {
            role: 'user',
            content: meta.user_content,
        }
    ];
}

function buildMetaFromReq(req: Request): META {
    const { body } = req;

    if (!body || !body.message) {
        throw new Error('格式错误，无数据，in buildMetaFromReq');
    }

    return {
        user_content: body.message || '请返回对应输出类型的空值',
        model: body.model || 'qwen3.5-flash',
        system_content: body.system_content || '',
        enable_thinking: body.enable_thinking ?? false,
        response_type: body.response_type || 'text',
        response_language: body.response_language || 'Chinese',
        other: body.other || {}
    };
}


async function commonChat(meta: META): Promise<ChatResult> {
    try {
        if (!meta.user_content?.length) {
            throw new Error('用户输入为空 in commonChat');
        }

        const messages = buildMessages(meta);

        const completion = await openai.chat.completions.create({
            model: meta.model || 'qwen3.5-flash',
            messages,
            // @ts-ignore
            extra_body: {
                enable_thinking: meta.enable_thinking || false,
            },
            response_format: { type: meta.response_type || 'text' }
        });

        const totalUsage = completion.usage?.total_tokens || 0;
        const content = completion.choices?.[0]?.message?.content || '';

        if (totalUsage <= 0) {
            throw new Error('无有效输出，可能是模型不支持该请求或其他问题 in commonChat');
        }

        return {
            ok: true,
            model: meta.model || 'qwen3.5-flash',
            content,
            usage: {
                total_tokens: totalUsage
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            ok: false,
            model: meta.model || 'qwen3.5-flash',
            content: message,
            usage: {
                total_tokens: 0
            }
        };
    }
}

async function streamChat(meta: META, res: Response): Promise<ChatResult> {
    try {
        if (!meta.user_content?.length) {
            throw new Error('用户输入为空 in streamChat');
        }

        const messages = buildMessages(meta);

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        // @ts-ignore
        const stream = await openai.chat.completions.create({
            model: meta.model || 'qwen3.5-flash',
            messages,
            stream: true,
            stream_options: {
                include_usage: true
            },
            // @ts-ignore
            extra_body: {
                enable_thinking: meta.enable_thinking || false,
            }
        });

        type ReasoningDelta = {
            content?: string | null;
            reasoning_content?: string | null;
        };

        type StreamChunkUsage = {
            completion_tokens?: number | null;
            prompt_tokens?: number | null;
            total_tokens?: number | null;
        };

        let contentText = '';
        let totalTokens = 0;

        for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta as ReasoningDelta | undefined;
            const usage = chunk.usage as StreamChunkUsage | undefined;

            if (delta?.reasoning_content) {
                res.write(`data: ${JSON.stringify({
                    type: 'reasoning',
                    content: delta.reasoning_content
                })}\n\n`);
            }

            if (delta?.content) {
                contentText += delta.content;
                res.write(`data: ${JSON.stringify({
                    type: 'content',
                    content: delta.content
                })}\n\n`);
            }

            // 最后一个块 choices 为空，但会带 usage
            if (usage?.total_tokens && usage.total_tokens > 0) {
                totalTokens = usage.total_tokens;
            }
        }

        res.write(`data: ${JSON.stringify({
            type: 'done',
            usage: {
                total_tokens: totalTokens
            }
        })}\n\n`);
        res.end();

        return {
            ok: true,
            model: meta.model || 'qwen3.5-flash',
            content: contentText,
            usage: {
                total_tokens: totalTokens
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (!res.headersSent) {
            sendError(res, message, 500);
        } else if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({
                type: 'error',
                content: message
            })}\n\n`);
            res.end();
        }

        return {
            ok: false,
            model: meta.model || 'qwen3.5-flash',
            content: message,
            usage: {
                total_tokens: 0
            }
        };
    }
}

async function commonChatHandler(req: Request, res: Response): Promise<any> {
    try {
        console.log('Received common chat request with body:', req);
        const userId = getUserIdFromReq(req);
        const user = await getUserById(userId);

        if (!user) {
            return sendError(res, '用户不存在', 404);
        }

        if (user.credits <= 0) {
            return res.status(403).json({
                message: '额度不足'
            });
        }

        const meta = buildMetaFromReq(req);
        const result = await commonChat(meta);

        const totalUsage = result.usage.total_tokens;

        if (!result.ok) {
            return sendError(res, result.content, 500);
        }

        if (totalUsage <= 0) {
            return sendError(res, '无有效输出，可能是模型不支持该请求或其他问题 in commonChatHandler', 500);
        }

        await pool.execute(
            'UPDATE user_account SET credits = credits - ? WHERE id = ?',
            [totalUsage, userId]
        );

        return sendResult(res, result);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return sendError(res, message, 500);
    }
}

async function streamChatHandler(req: Request, res: Response): Promise<any> {
    try {
        const userId = getUserIdFromReq(req);
        const user = await getUserById(userId);

        if (!user) {
            return sendError(res, '用户不存在', 404);
        }

        if (user.credits <= 0) {
            return res.status(403).json({
                message: '额度不足'
            });
        }

        const meta = buildMetaFromReq(req);
        const result = await streamChat(meta, res);

        if (!result.ok) {
            return;
        }

        if (result.usage.total_tokens > 0) {
            await pool.execute(
                'UPDATE user_account SET credits = credits - ? WHERE id = ?',
                [result.usage.total_tokens, userId]
            );
        }

        return;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';

        if (!res.headersSent) {
            return sendError(res, message, 500);
        }

        if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({
                type: 'error',
                content: message
            })}\n\n`);
            res.end();
        }

        return;
    }
}

export {
    commonChatHandler,
    streamChatHandler,
    commonChat,
    streamChat
};