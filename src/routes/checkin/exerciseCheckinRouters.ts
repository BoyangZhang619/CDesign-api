import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { 
    insertExerciseRecord, 
    getExerciseRecords, 
    updateExerciseRecord, 
    deleteExerciseRecord, 
    getExerciseStatistics,
    getExerciseStatisticsByType,
    getSummary,
    getAISummary,
    getAllDailyAISummary
} from "../../controllers/exerciseCheckinController.js";

const router = express.Router();

router.use(authMiddleware);

// 新增运动记录
router.post("/checkin/exercise", insertExerciseRecord);

// 查询今天所有运动记录
router.get("/checkin/exercise", getExerciseRecords);

// 更新运动记录
router.put("/checkin/exercise/:exerciseRecordId", updateExerciseRecord);

// 删除运动记录
router.delete("/checkin/exercise/:exerciseRecordId", deleteExerciseRecord);

// 获取运动统计（近7天或30天）
router.get("/checkin/exercise/statistics", getExerciseStatistics);

// 按活动类型获取统计
router.get("/checkin/exercise/statistics/type", getExerciseStatisticsByType);

// 获取运动总结
router.get("/checkin/exercise/summary", getSummary);

// 获取AI分析总结
router.get("/checkin/exercise/ai-summary", getAISummary);

// 获取所有AI总结（包含所有维度）
router.get("/checkin/exercise/ai-summary/all", getAllDailyAISummary);

export default router;