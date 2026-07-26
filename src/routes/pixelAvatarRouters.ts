/**
 * 像素头像路由（16色调色板，8/16/32 level）
 * 全部操作 user_avatar 表（与 characterAvatar 共享同一表，不同列语义）
 */
import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    getMyAvatar,
    saveAvatar,
    getAvatarHistory,
    getDefaultAvatars,
    getPalette,
} from '../controllers/avatarController.js';

const router = express.Router();

// 色板公开
router.get('/palette', getPalette);

router.use(authMiddleware);

// 获取当前头像
router.get('/', getMyAvatar);

// 保存头像
router.post('/', saveAvatar);

// 历史头像列表
router.get('/history', getAvatarHistory);

// 默认头像库
router.get('/defaults', getDefaultAvatars);

export default router;
