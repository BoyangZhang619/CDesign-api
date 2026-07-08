import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getMyAvatar,
  saveAvatar,
  getAvatarHistory,
  getDefaultAvatars,
  getPalette,
} from '../controllers/avatarController.js';

const router = Router();

// 获取调色板（无需登录）
router.get('/palette', getPalette);

// 获取系统默认头像列表
router.get('/defaults', getDefaultAvatars);

// 获取当前用户头像（无头像时自动随机分配默认头像）
router.get('/', authMiddleware, getMyAvatar);

// 保存/创建新头像
router.post('/', authMiddleware, saveAvatar);

// 获取用户历史头像
router.get('/history', authMiddleware, getAvatarHistory);

export default router;
