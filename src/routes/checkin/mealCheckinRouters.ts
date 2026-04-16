import Express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { 
    getCheckInRecords,
    insertCheckInRecord,
    getCheckInRecordsWithPagination,
    getSummary,
    getAISummary,
    getAllDailyAISummary
} from "../../controllers/mealCheckinController.js";

const router = Express.Router();

router.use(authMiddleware);

router.post("/checkin/meal", insertCheckInRecord);
router.get("/checkin/meal", getCheckInRecords);
router.get("/checkin/meal/paginated/:limit/:offset", getCheckInRecordsWithPagination);
router.get("/checkin/meal/summary", getSummary);
router.get("/checkin/meal/ai-summary/all", getAllDailyAISummary);
router.get("/checkin/meal/ai-summary", getAISummary);

export default router;
