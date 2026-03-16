import pool from '../config/db.js';
import { Request, Response } from 'express';
import { sendError, sendResult } from '../util/response.js';
import { send } from 'node:process';

interface authRequest extends Request {
    user?: any;
}

async function chat(req: authRequest, res: Response) {
    try {
        const { prompt } = req.body;
        const userId = req.user.userId;

        if (!prompt) {
            return sendError(res, '问题不能为空', 400);
        }

        const [rows] = await pool.execute(
            'SELECT id, credits FROM users WHERE id = ? LIMIT 1',
            [userId]
        );

        if ((rows as any[]).length === 0) {
            return sendError(res, '用户不存在', 404);
        }

        const user = rows[0];

        if (user.credits <= 0) {
            return res.status(403).json({
                message: '额度不足'
            });
        }

        // 模拟扣 1 次额度
        await pool.execute(
            'UPDATE users SET credits = credits - 1 WHERE id = ?',
            [userId]
        );

        // 模拟 AI 响应
        const result = `AI 已收到你的问题：${prompt}`;

        return sendResult(res, {
            message: '调用成功',
            result,
            cost: 1
        });
    } catch (error) {
        return sendError(res, error.message + 'AI 调用失败', 500);
    }
}

export { chat };