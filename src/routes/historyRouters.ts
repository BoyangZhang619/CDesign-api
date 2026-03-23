import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getHistory } from "../controllers/historyController.js";

const router = express.Router();

// 获取历史记录，支持分页、排序、搜索和类型筛选
router.get('/get', authMiddleware, getHistory);

export default router;
