import pool from "../config/db.js";
import { sendError, sendResult } from "../util/response.js";
import { Request, Response } from "express";
import { getUserIdFromReq } from "./sharedMethods.js";

// 验证头像大小
function validateAvatarSize(size: number): boolean {
    return [8, 16, 32].includes(size);
}

// 验证 RGBA 颜色字符串格式
function validateRGBAColor(color: string): boolean {
    return /^#[0-9a-fA-F]{8}$/.test(color);
}

// 验证头像数据格式和大小
function validateAvatarData(avatarData: string, size: number): { valid: boolean; message: string } {
    if (!avatarData || typeof avatarData !== 'string') {
        return { valid: false, message: '头像数据不能为空' };
    }

    const colors = avatarData.split(',').map(c => c.trim()).filter(c => c);
    const expectedCount = size * size;

    if (colors.length !== expectedCount) {
        return {
            valid: false,
            message: `${size}x${size}头像应包含${expectedCount}个颜色，但收到${colors.length}个`
        };
    }

    // 验证每个颜色字符串格式
    for (const color of colors) {
        if (!validateRGBAColor(color)) {
            return {
                valid: false,
                message: `无效的颜色格式: ${color}，应为#RRGGBBAA格式`
            };
        }
    }

    return { valid: true, message: '头像数据有效' };
}

// 创建新头像
async function createAvatar(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { avatar_size, avatar_data, is_current = false } = req.body;

        // 验证必填字段
        if (!avatar_size || !avatar_data) {
            return sendError(res, '头像大小和数据为必填项');
        }

        // 验证头像大小
        if (!validateAvatarSize(avatar_size)) {
            return sendError(res, '头像大小必须是 8、16 或 32 之一');
        }

        // 验证头像数据
        const validation = validateAvatarData(avatar_data, avatar_size);
        if (!validation.valid) {
            return sendError(res, validation.message);
        }

        // 如果设置为当前使用，需要清除同大小的其他当前头像
        if (is_current) {
            await pool.execute(
                'UPDATE character_avatar SET is_current = false WHERE user_id = ? AND avatar_size = ? AND is_current = true',
                [userId, avatar_size]
            );
        }

        // 插入新头像
        const [result] = await pool.execute(
            'INSERT INTO character_avatar (user_id, avatar_size, avatar_data, is_current) VALUES (?, ?, ?, ?)',
            [userId, avatar_size, avatar_data, is_current ? 1 : 0]
        );

        const avatarId = (result as any).insertId;

        return sendResult(res, {
            avatarId,
            message: '头像创建成功',
            data: {
                id: avatarId,
                user_id: userId,
                avatar_size,
                is_current,
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        return sendError(res, '创建头像失败: ' + error);
    }
}

// 获取用户所有头像
async function getAvatarsByUser(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);

        const [rows] = await pool.execute(
            'SELECT id, user_id, avatar_size, avatar_data, is_current, created_at FROM character_avatar WHERE user_id = ? ORDER BY avatar_size ASC, created_at DESC',
            [userId]
        );

        return sendResult(res, {
            message: '获取头像成功',
            data: rows as any[]
        });
    } catch (error) {
        return sendError(res, '获取头像失败: ' + error);
    }
}

// 获取指定大小的头像
async function getAvatarBySize(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { size } = req.query;

        if (!size || !validateAvatarSize(parseInt(size as string))) {
            return sendError(res, '无效的头像大小参数');
        }

        const [rows] = await pool.execute(
            'SELECT id, user_id, avatar_size, avatar_data, is_current, created_at FROM character_avatar WHERE user_id = ? AND avatar_size = ? ORDER BY created_at DESC',
            [userId, parseInt(size as string)]
        );

        return sendResult(res, {
            message: '获取头像成功',
            data: rows as any[]
        });
    } catch (error) {
        return sendError(res, '获取头像失败: ' + error);
    }
}

// 获取当前使用的头像
async function getCurrentAvatar(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { size } = req.query;

        if (!size || !validateAvatarSize(parseInt(size as string))) {
            return sendError(res, '无效的头像大小参数');
        }

        const [rows] = await pool.execute(
            'SELECT id, user_id, avatar_size, avatar_data, is_current, created_at FROM character_avatar WHERE user_id = ? AND avatar_size = ? AND is_current = true',
            [userId, parseInt(size as string)]
        );

        if ((rows as any[]).length === 0) {
            return sendResult(res, {
                message: `尚未设置${parseInt(size as string)}x${parseInt(size as string)}的头像`,
                data: null
            });
        }

        return sendResult(res, {
            message: '获取当前头像成功',
            data: (rows as any[])[0]
        });
    } catch (error) {
        return sendError(res, '获取当前头像失败: ' + error);
    }
}

// 设置为当前使用的头像
async function setCurrentAvatar(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { avatarId } = req.params;

        if (!avatarId) {
            return sendError(res, '头像ID为必填项');
        }

        // 获取要设置的头像信息
        const [avatarRows] = await pool.execute(
            'SELECT avatar_size FROM character_avatar WHERE id = ? AND user_id = ?',
            [avatarId, userId]
        );

        if ((avatarRows as any[]).length === 0) {
            return sendError(res, '头像不存在');
        }

        const avatarSize = (avatarRows as any[])[0].avatar_size;

        // 清除同大小的其他当前头像
        await pool.execute(
            'UPDATE character_avatar SET is_current = false WHERE user_id = ? AND avatar_size = ? AND id != ?',
            [userId, avatarSize, avatarId]
        );

        // 设置当前头像
        await pool.execute(
            'UPDATE character_avatar SET is_current = true WHERE id = ? AND user_id = ?',
            [avatarId, userId]
        );

        return sendResult(res, {
            message: '头像设置成功',
            data: {
                avatarId,
                avatarSize,
                isCurrent: true
            }
        });
    } catch (error) {
        return sendError(res, '设置头像失败: ' + error);
    }
}

// 删除头像
async function deleteAvatar(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { avatarId } = req.params;

        if (!avatarId) {
            return sendError(res, '头像ID为必填项');
        }

        const result = await pool.execute(
            'DELETE FROM character_avatar WHERE id = ? AND user_id = ?',
            [avatarId, userId]
        );

        if ((result as any)[0].affectedRows === 0) {
            return sendError(res, '头像不存在或无权删除');
        }

        return sendResult(res, {
            message: '头像已删除'
        });
    } catch (error) {
        return sendError(res, '删除头像失败: ' + error);
    }
}

// 批量删除指定大小的所有头像
async function deleteAvatarsBySize(req: Request, res: Response): Promise<Response> {
    try {
        const userId = getUserIdFromReq(req);
        const { size } = req.query;

        if (!size || !validateAvatarSize(parseInt(size as string))) {
            return sendError(res, '无效的头像大小参数');
        }

        const result = await pool.execute(
            'DELETE FROM character_avatar WHERE user_id = ? AND avatar_size = ?',
            [userId, parseInt(size as string)]
        );

        return sendResult(res, {
            message: `已删除${(result as any)[0].affectedRows}个${parseInt(size as string)}x${parseInt(size as string)}的头像`,
            deletedCount: (result as any)[0].affectedRows
        });
    } catch (error) {
        return sendError(res, '删除头像失败: ' + error);
    }
}

export {
    createAvatar,
    getAvatarsByUser,
    getAvatarBySize,
    getCurrentAvatar,
    setCurrentAvatar,
    deleteAvatar,
    deleteAvatarsBySize
};
