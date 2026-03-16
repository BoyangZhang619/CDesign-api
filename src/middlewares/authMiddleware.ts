import { verifyAccessToken } from '../services/tokenService.js';
import { Request, Response, NextFunction } from 'express';
import { sendError, sendResult } from '../util/response.js';

interface authRequest extends Request {
    user?: any;
}

function authMiddleware(req: authRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, 'Unauthorized，缺失或者无效的令牌', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const user = verifyAccessToken(token);
        req.user = user;
        next();
    } catch (error) {
        return sendError(res, 'Unauthorized，缺失或者无效的令牌', 401);
    }
}

export default authMiddleware;