import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { getHistory, deleteHistory } from "../controllers/historyController.js";

const router = express.Router();

router.use(authMiddleware);

// 获取历史记录，支持分页、排序、搜索和类型筛选
router.get('/get', getHistory);

// 删除单条历史记录
router.delete('/:id', deleteHistory);

export default router;
