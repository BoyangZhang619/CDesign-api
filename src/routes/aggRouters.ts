
import e, { Router } from 'express';
import { AIChatController } from '../controllers/aiChatController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);


export default router;