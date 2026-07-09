import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { createCheckin, getCheckins, getCheckinDetail, getTodaySummary } from '../controllers/checkinController.js';

const router = Router();
router.use(authMiddleware);

router.post('/', createCheckin);
router.get('/', getCheckins);
router.get('/summary', getTodaySummary);
router.get('/:id', getCheckinDetail);

export default router;
