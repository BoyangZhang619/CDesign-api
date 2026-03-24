import Express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { 
    getCheckInRecords,
    insertCheckInRecord,
    getCheckInRecordsWithPagination,
    getSummary,
    getAISummary,
} from "../../controllers/mealCheckinController.js";

const router = Express.Router();

router.post("/checkin/meal", authMiddleware, insertCheckInRecord);
router.get("/checkin/meal", authMiddleware, getCheckInRecords);
router.get("/checkin/meal/paginated/:limit/:offset", authMiddleware, getCheckInRecordsWithPagination);
router.get("/checkin/meal/summary", authMiddleware, getSummary);
router.get("/checkin/meal/ai-summary", authMiddleware, getAISummary);

export default router;
