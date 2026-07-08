import { verifyAccessToken } from '../services/tokenService.js';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../util/response.js';
import type { JwtPayload } from 'jsonwebtoken';

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    console.log('🔐 [authMiddleware] 检查授权头:', authHeader ? '✅ 存在' : '❌ 缺失', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('❌ [authMiddleware] 缺失或无效的授权头:', authHeader);
        return sendError(res, 'Unauthorized，缺失或者无效的令牌', 401);
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 [authMiddleware] Token 长度:', token.length);

    try {
        const user = verifyAccessToken(token) as JwtPayload;
        console.log('✅ [authMiddleware] 用户验证成功:', { userId: user.userId, email: user.email });
        req.user = user;
        next();
    } catch (err: unknown) {
        console.error('❌ [authMiddleware] Token 验证失败:', err);
        return sendError(res, 'Unauthorized，缺失或者无效的令牌', 401);
    }
}

export default authMiddleware;