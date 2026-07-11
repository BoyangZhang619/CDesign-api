/**
 * AI 对话控制器 — 2026-07-11 重构
 *
 * 所有 LLM 调用已从 DashScope/Qwen 迁移至 sanatura-fastapi (DeepSeek API 网关)。
 * 本文件保留原有的请求解析 + 额度校验逻辑，模型调用通过 fastapiClient 代理。
 *
 * ⚠️ 原有 commonChat / streamChat 等直接 DashScope 调用函数已雪藏为 _legacy*。
 *    如需查看旧实现，见本文件底部 _LEGACY 区块。
 */
import type { Request, Response } from 'express';
import { sendError, sendResult } from '../util/response.js';
import { getUserIdFromReq, getUserById } from './sharedMethods.js';
import { fastapiChat, fastapiChatStream, type FastAPIChatRequest } from '../services/fastapiClient.js';

type ResponseTextType = 'text' | 'json_object';

function buildMessages(req: Request): Array<{ role: string; content: string }> {
    const { body } = req;
    const systemContent = body.system_content ||
        '你是一个极度客观,理性的助手,你需要合理地友善地帮助、回答或完成接下来的问题或挑战。';
    const formatInst: Record<string, string> = {
        text: '请仅输出纯文本，不要输出 markdown 符号，不要附加解释。',
        json_object: '请仅输出合法 JSON，不要输出代码块，不要输出额外说明。',
    };
    const lang = body.response_language || 'Chinese';
    const fmt = formatInst[body.response_type || 'text'] || formatInst.text;
    const limit = JSON.stringify({ language: lang, responseTextType: fmt });

    return [
        { role: 'system', content: systemContent + `\n同时你需要遵守下列json中对应的规则:\n${limit}` },
        { role: 'user', content: body.message || '请返回对应输出类型的空值' },
    ];
}

// ── 单轮非流式 ─────────────────────────────────────────────

async function commonChatHandler(req: Request, res: Response): Promise<any> {
    try {
        const userId = getUserIdFromReq(req);
        const user = await getUserById(userId);

        if (!user) return sendError(res, '用户不存在', 404);
        if (user.credits <= 0) return sendError(res, '额度不足', 403);

        const fastReq: FastAPIChatRequest = {
            messages: buildMessages(req),
            model: req.body.model || undefined,
            temperature: req.body.temperature ?? 0.7,
            max_tokens: req.body.max_tokens ?? 2048,
            response_format: req.body.response_type ? { type: req.body.response_type } : undefined,
            user_id: userId,
        };

        const result = await fastapiChat(fastReq);

        return sendResult(res, {
            ok: true,
            model: result.model,
            content: result.content,
            usage: result.usage,
        });
    } catch (error: any) {
        const message = error?.response?.data?.detail || error.message || 'Unknown error';
        const status = error?.response?.status || 500;
        return sendError(res, message, status);
    }
}

// ── 单轮流式 ───────────────────────────────────────────────

async function streamChatHandler(req: Request, res: Response): Promise<void> {
    try {
        const userId = getUserIdFromReq(req);
        const user = await getUserById(userId);

        if (!user) { sendError(res, '用户不存在', 404); return; }
        if (user.credits <= 0) { sendError(res, '额度不足', 403); return; }

        const fastReq: FastAPIChatRequest = {
            messages: buildMessages(req),
            model: req.body.model || undefined,
            temperature: req.body.temperature ?? 0.7,
            max_tokens: req.body.max_tokens ?? 2048,
            user_id: userId,
        };

        // 直接透传 FastAPI 的 SSE 流到客户端
        const fastStream = await fastapiChatStream(fastReq);

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        const reader = fastStream.body!.getReader();
        const decoder = new TextDecoder();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(decoder.decode(value, { stream: true }));
            }
        } finally {
            reader.releaseLock();
            res.end();
        }
    } catch (error: any) {
        const message = error?.response?.data?.detail || error.message || 'Unknown error';
        if (!res.headersSent) {
            sendError(res, message, 500);
        } else if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
            res.end();
        }
    }
}

export { commonChatHandler, streamChatHandler };