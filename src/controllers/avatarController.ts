import { Request, Response } from 'express';
import { dbQuery } from '../config/db.js';
import { sendResult, sendError } from '../util/response.js';
import {
  decodePixels, validatePixelData, generateDefaultAvatars,
  AVATAR_LEVELS, PALETTE, type AvatarLevel
} from '../services/avatarService.js';

// ── 获取用户当前头像 ────────────────────────────────────────
async function getMyAvatar(req: Request, res: Response): Promise<Response> {
  const userId = req.user.userId;
  try {
    const [rows] = await dbQuery(
      'SELECT id, level, pixel_data, is_current FROM pixel_avatars WHERE user_id = ? AND is_current = 1 LIMIT 1',
      [userId]
    );
    if ((rows as any[]).length === 0) {
      // 无头像 — 随机分配一个默认头像
      const assigned = await assignRandomDefault(userId);
      if (assigned) {
        return sendResult(res, { avatar: assigned, isDefault: true });
      }
      return sendResult(res, { avatar: null, isDefault: false });
    }
    const avatar = (rows as any[])[0];
    return sendResult(res, {
      avatar: {
        id: avatar.id,
        level: avatar.level,
        pixelData: avatar.pixel_data,
        colors: decodePixels(avatar.pixel_data, avatar.level as AvatarLevel),
      },
      isDefault: false,
      palette: PALETTE,
    });
  } catch (err: unknown) {
    return sendError(res, '获取头像失败: ' + (err as Error).message, 500);
  }
}

// ── 保存/更新头像 ───────────────────────────────────────────
async function saveAvatar(req: Request, res: Response): Promise<Response> {
  const userId = req.user.userId;
  const { pixelData, level } = req.body;

  if (!pixelData || !level) {
    return sendError(res, '缺少 pixelData 或 level', 400);
  }
  if (!AVATAR_LEVELS.includes(level)) {
    return sendError(res, `无效的 level，支持: ${AVATAR_LEVELS.join(',')}`, 400);
  }
  if (!validatePixelData(pixelData, level)) {
    return sendError(res, 'pixelData 长度与 level 不匹配或包含非法字符', 400);
  }

  try {
    // 取消当前头像标记
    await dbQuery('UPDATE pixel_avatars SET is_current = 0 WHERE user_id = ?', [userId]);
    // 插入新头像
    await dbQuery(
      'INSERT INTO pixel_avatars (user_id, level, pixel_data, is_current) VALUES (?, ?, ?, 1)',
      [userId, level, pixelData]
    );
    return sendResult(res, { message: '头像保存成功', level, pixelData });
  } catch (err: unknown) {
    return sendError(res, '保存头像失败: ' + (err as Error).message, 500);
  }
}

// ── 获取用户历史头像列表 ────────────────────────────────────
async function getAvatarHistory(req: Request, res: Response): Promise<Response> {
  const userId = req.user.userId;
  try {
    const [rows] = await dbQuery(
      'SELECT id, level, pixel_data, is_current, created_at FROM pixel_avatars WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    return sendResult(res, { avatars: (rows as any[]).map(r => ({
      id: r.id, level: r.level, pixelData: r.pixel_data,
      isCurrent: !!r.is_current, createdAt: r.created_at,
    }))});
  } catch (err: unknown) {
    return sendError(res, '获取历史失败: ' + (err as Error).message, 500);
  }
}

// ── 获取默认头像列表（供新用户选择） ─────────────────────────
async function getDefaultAvatars(_req: Request, res: Response): Promise<Response> {
  try {
    // 先从 DB 读取已持久化的默认头像
    const [rows] = await dbQuery(
      'SELECT id, level, pixel_data FROM pixel_avatars WHERE is_default = 1 LIMIT 20'
    );
    if ((rows as any[]).length > 0) {
      return sendResult(res, {
        defaults: (rows as any[]).map(r => ({
          id: r.id, level: r.level, pixelData: r.pixel_data,
          colors: decodePixels(r.pixel_data, r.level as AvatarLevel),
        })),
        palette: PALETTE,
      });
    }
    // 无默认头像则即时生成
    const defaults = generateDefaultAvatars();
    for (const data of defaults) {
      await dbQuery(
        'INSERT INTO pixel_avatars (user_id, level, pixel_data, is_default) VALUES (NULL, 16, ?, 1)',
        [data]
      );
    }
    return sendResult(res, {
      defaults: defaults.map(d => ({
        level: 16, pixelData: d, colors: decodePixels(d, 16),
      })),
      palette: PALETTE,
    });
  } catch (err: unknown) {
    return sendError(res, '获取默认头像失败: ' + (err as Error).message, 500);
  }
}

// ── 获取调色板 ──────────────────────────────────────────────
async function getPalette(_req: Request, res: Response): Promise<Response> {
  return sendResult(res, { palette: PALETTE });
}

// ── 内部：随机分配默认头像 ───────────────────────────────────
async function assignRandomDefault(userId: number): Promise<{ level: number; pixelData: string } | null> {
  try {
    const [rows] = await dbQuery(
      'SELECT id, level, pixel_data FROM pixel_avatars WHERE is_default = 1 ORDER BY RAND() LIMIT 1'
    );
    if ((rows as any[]).length === 0) return null;
    const def = (rows as any[])[0];
    await dbQuery(
      'INSERT INTO pixel_avatars (user_id, level, pixel_data, is_current) VALUES (?, ?, ?, 1)',
      [userId, def.level, def.pixel_data]
    );
    return { level: def.level, pixelData: def.pixel_data };
  } catch {
    return null;
  }
}

export {
  getMyAvatar,
  saveAvatar,
  getAvatarHistory,
  getDefaultAvatars,
  getPalette,
};
