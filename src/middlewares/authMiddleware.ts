import { verifyAccessToken } from '../services/tokenService.js';
import { Request, Response, NextFunction } from 'express';
import { sendError } from '../util/response.js';

function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader);
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing or invalid authorization header');
        return sendError(res, 'Unauthorized，缺失或者无效的令牌', 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const user = verifyAccessToken(token);
        console.log('Verified user from token:', user);
        req.user = user;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return sendError(res, 'Unauthorized，缺失或者无效的令牌', 401);
    }
}

export default authMiddleware;