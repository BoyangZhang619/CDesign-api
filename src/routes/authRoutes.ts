import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { register, login, refresh, me, logout, logoutAll } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, me);
router.post('/logout', logout);
router.post('/logout-all', authMiddleware, logoutAll);

export default router;