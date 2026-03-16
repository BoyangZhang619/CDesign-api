import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { commonChatHandler, streamChatHandler } from '../controllers/aiController.js';

const router = express.Router();

router.post('/ptio/common', commonChatHandler);
router.post('/ptio/stream', streamChatHandler);

export default router;