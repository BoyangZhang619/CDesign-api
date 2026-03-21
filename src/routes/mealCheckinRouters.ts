import Express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getCheckInRecords, insertCheckInRecord, getCheckInRecordsWithPagination } from "../controllers/mealCheckinController.js";

const router = Express.Router();

router.post("/checkin/meal", authMiddleware, insertCheckInRecord);
router.get("/checkin/meal", authMiddleware, getCheckInRecords);
router.get("/checkin/meal/paginated/:limit/:offset", authMiddleware, getCheckInRecordsWithPagination);


export default router;
