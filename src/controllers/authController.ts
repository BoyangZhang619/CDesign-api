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

// 返回 refresh token 的 cookie 选项
function getRefreshCookieOptions(): Object {
    return {
        httpOnly: true,
        secure: env.nodeEnv === 'production',
        sameSite: 'lax' as boolean | "lax" | "strict" | "none",
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7天
    };
}

// 检测用户是否存在在user_account表中
async function userExists(email: string): Promise<boolean> {
    try {
        const [rows] = await pool.execute('SELECT id FROM user_account WHERE email = ?', [email]);
        return (rows as any[]).length > 0;
    } catch (error) {
        console.error('检测用户是否存在时出错:', error);
        return false;
    }
}

// 检测用户是否正常（存在且status=1）
async function userAccountNormal(email: string): Promise<boolean> {
    try {
        const [rows] = await pool.execute('SELECT id FROM user_account WHERE email = ? AND status = 1', [email]);
        return (rows as any[]).length > 0;
    } catch (error) {
        console.error('检测用户是否正常时出错:', error);
        return false;
    }
}

// 注册新用户
async function register(req: Request, res: Response): Promise<Response> {
    try {
        const { email, password } = req.body;
        const name = req.body.name || 'A guy/girl';
        const avatar_url = req.body.avatar_url || 'https://homepage-2em.pages.dev/iconWhite.png';
        const phone = req.body.phone || '';
        const role = req.body.role || 'student';

        if (!email || !password) {
            return sendError(res, '邮箱和密码不能为空', 400);
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return sendError(res, '邮箱格式不正确', 400);
        }

        // 验证密码长度
        if (password.length < 6) {
            return sendError(res, '密码长度至少为 6 位', 400);
        }

        const exists = await userExists(email);
        if (exists) {
            return sendError(res, '该邮箱已被注册', 400);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        // await pool.execute('INSERT INTO users (email, password_hash, credits, name) VALUES (?, ?, ?, ?)', [email, hashedPassword, 10000, name]);
        await pool.execute('INSERT INTO user_account (credits,email, password_hash, nickname, avatar_url, phone, role, status, admin, last_login_time, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())', [9876, email, hashedPassword, name, avatar_url, phone, role, 1, 0]);
        return sendResult(res, '注册成功');
    } catch (error) {
        return sendError(res, error.message + " 注册失败", 500);
    }
}

// 用户登录
async function login(req: Request, res: Response): Promise<Response> {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return sendError(res, '邮箱和密码不能为空', 400);
        }
        const [rows] = await pool.execute('SELECT id, email, password_hash FROM user_account WHERE email = ?', [email]);
        if ((rows as any[]).length === 0) {
            return sendError(res, '账号未注册', 400);
        }
        const user = (rows as any[])[0];
        const isUserNormal = await userAccountNormal(email);
        if (isUserNormal === false) {
            return sendError(res, '账号异常，请联系管理员', 403);
        }
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
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

        await updateLastLoginTime(user.id);

        return sendResult(res, {
            ip: req.ip,
            message: '登录成功',
            accessToken,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        return sendError(res, error.message + " 登录失败", 500);
    }
}

// 刷新 access token,并实现 refresh token 轮换
async function refresh(req: Request, res: Response): Promise<Response> {
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
            `SELECT id, user_id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash = ? LIMIT 1`,
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

// 获取当前登录用户信息
async function me(req: Request, res: Response): Promise<Response> {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM user_account WHERE id = ? LIMIT 1',
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

// 退出登录（作废当前 refresh token）
async function logout(req: Request, res: Response): Promise<Response> {
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

// 退出所有设备（作废当前用户的所有 refresh token）
async function logoutAll(req: Request, res: Response): Promise<Response> {
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

// 更新用户最后登录时间（每次登录成功后调用）
async function updateLastLoginTime(userId: number): Promise<void> {
    try {
        await pool.execute(
            'UPDATE user_account SET last_login_at = NOW() WHERE id = ?',
            [userId]
        );
    } catch (error) {
        console.error('updateLastLoginTime error:', error);
    }
}

// 更新用户信息
async function updateUserInfo(req: Request, res: Response): Promise<Response> {
    const {
        email = null, nickname = null, avatar_url = null, phone = null, role = null } = req.body;
    const userId = req.user.userId ?? null;
    try {
        const [userRows] = await pool.execute(
            'SELECT id FROM user_account WHERE email = ? AND id = ? LIMIT 1',
            [email, userId]
        );

        if ((userRows as any[]).length === 0) {
            return sendError(res, '用户不存在', 404);
        }

        // 更新用户信息
        await pool.execute(
            'UPDATE user_account SET nickname = ?, avatar_url = ?, phone = ?, role = ? WHERE id = ?',
            [
                nickname,
                avatar_url,
                phone,
                role,
                userId
            ]
        );

        return sendResult(res, {
            message: '用户信息更新成功',
            userInfo: {
                email,
                userId
            }
        });
    } catch (error) {
        console.error('updateUserInfo error:', error);
        return sendError(res, '用户信息更新失败', 500);
    }
}

// 切换用户信息 [nickname, avatar_url, role]
async function SwitchCommonUserInfo(req: Request, res: Response): Promise<Response> {
    const { email = null, password = null, switch_type = null, switch_value = null } = req.body;
    const userId = req.user.userId ?? null;
    const [userRows] = await pool.execute(
        'SELECT id FROM user_account WHERE email = ? AND id = ? LIMIT 1',
        [email, userId]
    );

    if ((userRows as any[]).length === 0) {
        return sendError(res, '用户不存在', 404);
    }

    const [rows] = await pool.execute('SELECT count(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = "user_account" AND column_name = ?', [switch_type]);

    if ((rows as any[])[0].count === 0) {
        return sendError(res, '无效的切换类型', 400);
    }

    await pool.execute(`UPDATE user_account SET ${switch_type} = ? WHERE id = ?`, [switch_value, userId]);
    await updateLastLoginTime(userId);

    return sendResult(res, {
        message: '用户信息切换成功',
        userInfo: {
            email,
            userId
        }
    });
}

// 切换admin权限（仅测试用 骗你的，真正有admin的是直接改数据库的，嘻嘻）
async function SwitchAdmin(req: Request, res: Response): Promise<Response> {
    return sendError(res, '就你也想获得admin权限？', 404);
}

// 切换密码
async function SwitchPassword(req: Request, res: Response): Promise<Response> {
    const { email = null, old_password = null, new_password = null } = req.body;
    const userId = req.user.userId ?? null;

    // 检查用户是否存在
    const [userRows] = await pool.execute(
        'SELECT id, password FROM user_account WHERE email = ? AND id = ? LIMIT 1',
        [email, userId]
    );

    if ((userRows as any[]).length === 0) {
        return sendError(res, '用户不存在', 404);
    }

    const user = userRows[0];

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(old_password, user.password);
    if (!isOldPasswordValid) {
        return sendError(res, '旧密码不正确', 400);
    }

    // 更新密码
    const hashedNewPassword = await bcrypt.hash(new_password, 10);
    await pool.execute(
        'UPDATE user_account SET password = ? WHERE id = ?',
        [hashedNewPassword, userId]
    );
    await updateLastLoginTime(userId);

    return sendResult(res, {
        message: '密码切换成功',
        userInfo: {
            email,
            userId
        }
    });
}

// 切换邮箱
async function SwitchEmail(req: Request, res: Response): Promise<Response> {
    const { email = null, new_email = null } = req.body;
    const userId = req.user.userId ?? null;

    // 检查用户是否存在
    const [userRows] = await pool.execute(
        'SELECT id FROM user_account WHERE email = ? AND id = ? LIMIT 1',
        [email, userId]
    );

    if ((userRows as any[]).length === 0) {
        return sendError(res, '用户不存在', 404);
    }

    // 更新邮箱
    await pool.execute(
        'UPDATE user_account SET email = ? WHERE id = ?',
        [new_email, userId]
    );
    await updateLastLoginTime(userId);

    return sendResult(res, {
        message: '邮箱切换成功',
        userInfo: {
            email: new_email,
            userId
        }
    });
}


// 

export {
    register,
    login,
    refresh,
    me,
    logout,
    logoutAll,
    SwitchCommonUserInfo,
    SwitchAdmin,
    SwitchPassword,
    SwitchEmail,
    updateUserInfo
};
