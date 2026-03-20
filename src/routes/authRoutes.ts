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
    updateUserInfo
} from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, me);
router.post('/logout', authMiddleware, logout);
router.post('/logout-all', authMiddleware, logoutAll);
router.post('/switch-email', authMiddleware, SwitchEmail);
router.post('/switch-password', authMiddleware, SwitchPassword);
router.post('/switch-admin', authMiddleware, SwitchAdmin);
router.post('/switch-common-user-info', authMiddleware, SwitchAdmin);
router.post('/update-user-info', authMiddleware, updateUserInfo);

export default router;