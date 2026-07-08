import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    register,
    login,
    refresh,
    me,
    logout,
    logoutAll,
    SwitchAdmin,
    SwitchPassword,
    SwitchEmail,
    SwitchCommonUserInfo,
    updateUserInfo
} from '../controllers/authController.js';

const router = express.Router();

// 用户注册
router.post('/register', register);

// 用户登录
router.post('/login', login);

// 刷新refresh Token
router.post('/refresh', refresh);

// 获取当前用户信息
router.get('/me', authMiddleware, me);

// 用户登出
router.post('/logout', authMiddleware, logout);

// 用户全部登出,jiushi所有refresh token失效
router.post('/logout-all', authMiddleware, logoutAll);

// 切换邮箱
router.post('/switch-email', authMiddleware, SwitchEmail);

// 切换密码
router.post('/switch-password', authMiddleware, SwitchPassword);

// 切换管理员状态(想通过这个接口来换简直是无稽之谈)
router.post('/switch-admin', authMiddleware, SwitchAdmin);

// 切换基本用户信息
router.post('/switch-common-user-info', authMiddleware, SwitchCommonUserInfo);

// 更新用户信息（邮箱，名称，头像，手机号，身份）
router.post('/update-user-info', authMiddleware, updateUserInfo);

export default router;