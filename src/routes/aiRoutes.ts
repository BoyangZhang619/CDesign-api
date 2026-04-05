import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { commonChatHandler, streamChatHandler } from '../controllers/aiController.js';

const router = express.Router();

router.use(authMiddleware);

// 单次输出纯文本输入输出对话接口
router.post('/ptio/common', commonChatHandler);

// 流式输出纯文本输入输出对话接口
router.post('/ptio/stream', streamChatHandler);

export default router;