import express from 'express';
import authMiddleware from '../../middlewares/authMiddleware.js';
import {
    getDailyCheckin,
    getAISummary,
    detectDailyCheckin,
    deleteDailyCheckin,
    insertDailyCheckin,
    updateDailyCheckin,
    insertEmptyDailyCheckin
} from '../../controllers/dailyCheckinController.js';

const router = express.Router();

router.use(authMiddleware);

// 获取用户每日基本打卡信息
router.get('/get', getDailyCheckin);

// 获取用户每日AI分析总结
router.get('/ai-summary', getAISummary);

// 检测用户每日打卡信息是否存在
router.post('/detect', (req, res, next) => {
    detectDailyCheckin(req, res, true).catch(next);
});

// 删除用户每日打卡信息
router.delete('/delete', deleteDailyCheckin);

// 插入用户每日打卡信息
router.post('/insert', insertDailyCheckin);

// 更新用户每日打卡信息(可自动插入，这个方法实际是最优的，前端可以直接调用这个接口来更新用户每日打卡信息，如果没有就会自动插入空的打卡信息)
router.post('/update', updateDailyCheckin);

// 插入空的用户每日打卡信息
router.post('/insert-empty', insertEmptyDailyCheckin);

export default router;