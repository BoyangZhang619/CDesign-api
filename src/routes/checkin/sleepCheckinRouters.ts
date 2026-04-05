import Express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getSleepRecords, insertSleepRecord, updateSleepRecord, deleteSleepRecord, getSleepStatistics, getSummary, getAISummary } from "../../controllers/sleepCheckinController.js";

const router = Express.Router();

router.use(authMiddleware);

router.post("/checkin/sleep", insertSleepRecord);
router.get("/checkin/sleep", getSleepRecords);
router.put("/checkin/sleep/:sleepRecordId", updateSleepRecord);
router.delete("/checkin/sleep/:sleepRecordId", deleteSleepRecord);
router.get("/checkin/sleep/statistics", getSleepStatistics);
router.get("/checkin/sleep/summary", getSummary);
router.get("/checkin/sleep/ai-summary", getAISummary);

export default router;