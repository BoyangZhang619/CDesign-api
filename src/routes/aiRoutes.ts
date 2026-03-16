import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { chat } from '../controllers/aiController.js';

const router = express.Router();

router.post('/chat', authMiddleware, chat);

export default router;