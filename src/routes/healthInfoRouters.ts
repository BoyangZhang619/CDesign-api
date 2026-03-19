import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    CheckHealthInfo,
    InsertHealthInfo,
    UpdateHealthInfo,
    GetHealthInfo
} from '../controllers/healthInfoController.js';

const router = express.Router();

router.get('/get-health-info', authMiddleware, GetHealthInfo);
router.post('/check-health-info', authMiddleware, CheckHealthInfo);
router.post('/insert-health-info', authMiddleware, InsertHealthInfo);
router.post('/update-health-info', authMiddleware, UpdateHealthInfo);

export default router;