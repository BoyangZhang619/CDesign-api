import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { 
    insertExerciseRecord, 
    getExerciseRecords, 
    updateExerciseRecord, 
    deleteExerciseRecord, 
    getExerciseStatistics,
    getExerciseStatisticsByType
} from "../controllers/exerciseCheckinController.js";

const router = express.Router();

// 新增运动记录
router.post("/checkin/exercise", authMiddleware, insertExerciseRecord);

// 查询今天所有运动记录
router.get("/checkin/exercise", authMiddleware, getExerciseRecords);

// 更新运动记录
router.put("/checkin/exercise/:exerciseRecordId", authMiddleware, updateExerciseRecord);

// 删除运动记录
router.delete("/checkin/exercise/:exerciseRecordId", authMiddleware, deleteExerciseRecord);

// 获取运动统计（近7天或30天）
router.get("/checkin/exercise/statistics", authMiddleware, getExerciseStatistics);

// 按活动类型获取统计
router.get("/checkin/exercise/statistics/type", authMiddleware, getExerciseStatisticsByType);

export default router;