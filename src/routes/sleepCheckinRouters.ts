import Express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = Express.Router();
import { getSleepRecords, insertSleepRecord, updateSleepRecord, deleteSleepRecord, getSleepStatistics } from "../controllers/sleepCheckinController.js";

router.post("/checkin/sleep", authMiddleware, insertSleepRecord);
router.get("/checkin/sleep", authMiddleware, getSleepRecords);
router.put("/checkin/sleep/:sleepRecordId", authMiddleware, updateSleepRecord);
router.delete("/checkin/sleep/:sleepRecordId", authMiddleware, deleteSleepRecord);
router.get("/checkin/sleep/statistics", authMiddleware, getSleepStatistics);

export default router;