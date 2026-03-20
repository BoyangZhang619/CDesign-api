import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
    getDailyCheckin,
    detectDailyCheckin,
    deleteDailyCheckin,
    insertDailyCheckin,
    updateDailyCheckin
} from '../controllers/dailyCheckinController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/get', getDailyCheckin);
router.post('/detect',authMiddleware, (req, res, next) => {
    detectDailyCheckin(req, res, true).catch(next);
});
router.delete('/delete',authMiddleware, deleteDailyCheckin);
router.post('/insert',authMiddleware, insertDailyCheckin);
router.post('/update',authMiddleware, updateDailyCheckin);

export default router;