import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { sha256 } from '../util/hash.js';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken
} from '../services/tokenService.js';
import { sendError, sendResult } from '../util/response.js';
import { Request, Response } from 'express';
import env from '../config/env.js';

function getRefreshCookieOptions() {
    // TODO: path在设定好路由后需要确定
    return {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: 'lax' as boolean | "lax" | "strict" | "none",
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    };
}

async function register(req: Request, res: Response) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return sendError(res, '用户名和密码不能为空', 400);
        }
        if (await userExists(username)) {
            return sendError(res, '用户已存在', 400);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        return sendResult(res, '注册成功');
    } catch (error) {
        return sendError(res, error.message + " 注册失败", 500);
    }
}

async function userExists(username: string) {
    try {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        return (rows as any[]).length > 0;
    } catch (error) {
        console.error('检测用户是否存在时出错:', error);
        return false;
    }
}

async function login(req: Request, res: Response) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return sendError(res, '用户名和密码不能为空', 400);
        }
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        if ((rows as any[]).length === 0) {
            return sendError(res, '用户不存在', 400);
        }
        const user = (rows as any[])[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return sendError(res, '密码错误', 400);
        }
        const accessToken = await signAccessToken(user);
        const refreshToken = await signRefreshToken(user);
        const refreshTokenHash = sha256(refreshToken);

        await pool.execute(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
            [
                user.id,
                refreshTokenHash,
                req.headers['user-agent'] || null,
                req.ip || null
            ]);
        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

        return sendResult(res, {
            message: '登录成功',
            accessToken,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        return sendError(res, error.message + " 登录失败", 500);
    }
}

async function refresh(req: Request, res: Response) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return sendError(res, '缺少 refresh token', 401);
        }

        let payload;
        try {
            payload = verifyRefreshToken(refreshToken);
        } catch (error) {
            return sendError(res, '无效的 refresh token', 401);
        }

        const refreshTokenHash = sha256(refreshToken);

        const [rows] = await pool.execute(
            `SELECT id, user_id, revoked_at, expires_at
       FROM refresh_tokens
       WHERE token_hash = ?
       LIMIT 1`,
            [refreshTokenHash]
        );

        if ((rows as any[]).length === 0) {
            return sendError(res, 'refresh token 不存在', 401);
        }

        const tokenRecord = rows[0];

        if (tokenRecord.revoked_at) {
            return sendError(res, 'refresh token 已失效', 401);
        }

        const [userRows] = await pool.execute(
            'SELECT id, email, credits FROM users WHERE id = ? LIMIT 1',
            [payload.userId]
        );

        if ((userRows as any[]).length === 0) {
            return sendError(res, '用户不存在', 401);
        }

        const user = userRows[0];

        /**
         * refresh token 轮换：
         * 1. 作废旧 token
         * 2. 生成新 refresh token
         * 3. 存新 token
         * 4. 返回新 access token
         */
        await pool.execute(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?',
            [tokenRecord.id]
        );

        const newAccessToken = signAccessToken(user);
        const newRefreshToken = signRefreshToken(user);
        const newRefreshTokenHash = sha256(newRefreshToken);

        await pool.execute(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)`,
            [
                user.id,
                newRefreshTokenHash,
                req.headers['user-agent'] || null,
                req.ip || null
            ]
        );

        res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

        return sendResult(res, {
            accessToken: newAccessToken,
            user: {
                id: user.id,
                email: user.email,
                credits: user.credits
            }
        });
    } catch (error) {
        console.error('refresh error:', error);
        return sendError(res, '刷新失败', 500);
    }
}

async function me(req: Request, res: Response) {
    try {
        const [rows] = await pool.execute(
            'SELECT id, email, credits, created_at FROM users WHERE id = ? LIMIT 1',
            [req.user.userId]
        );

        if ((rows as any[]).length === 0) {
            return sendError(res, '用户不存在', 404);
        }

        return sendResult(res, {
            user: rows[0]
        });
    } catch (error) {
        console.error('me error:', error);
        return sendError(res, '获取用户信息失败', 500);
    }
}

/**
 * 单设备退出登录
 * 删除当前 refresh token 记录并清除 cookie
 */
async function logout(req: Request, res: Response) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const refreshTokenHash = sha256(refreshToken);
            await pool.execute(
                'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?',
                [refreshTokenHash]
            );
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: env.nodeEnv === 'production',
            sameSite: 'lax',
            path: '/api/auth'
        });

        return sendResult(res, {
            message: '退出成功'
        });
    } catch (error) {
        console.error('logout error:', error);
        return sendError(res, '退出失败', 500);
    }
}

/**
 * 全设备退出登录
 * 可用于"修改密码后全部设备失效"
 */
async function logoutAll(req: Request, res: Response) {
    try {
        await pool.execute(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
            [req.user.userId]
        );

        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: env.nodeEnv === 'production',
            sameSite: 'lax',
            path: '/api/auth'
        });

        return sendResult(res, {
            message: '已退出所有设备'
        });
    } catch (error) {
        console.error('logoutAll error:', error);
        return sendError(res, '操作失败', 500);
    }
}

export {
    register,
    login,
    refresh,
    me,
    logout,
    logoutAll
};