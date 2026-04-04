import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
    createAvatar,
    getAvatarsByUser,
    getAvatarBySize,
    getCurrentAvatar,
    setCurrentAvatar,
    deleteAvatar,
    deleteAvatarsBySize
} from "../controllers/characterAvatarController.js";

const router = express.Router();

// 创建新头像
router.post("/avatar", authMiddleware, createAvatar);

// 获取用户所有头像
router.get("/avatar", authMiddleware, getAvatarsByUser);

// 获取指定大小的所有头像
router.get("/avatar/size", authMiddleware, getAvatarBySize);

// 获取当前使用的头像（按大小）
router.get("/avatar/current", authMiddleware, getCurrentAvatar);

// 设置为当前使用的头像
router.put("/avatar/:avatarId/current", authMiddleware, setCurrentAvatar);

// 删除特定头像
router.delete("/avatar/:avatarId", authMiddleware, deleteAvatar);

// 删除指定大小的所有头像
router.delete("/avatar/size", authMiddleware, deleteAvatarsBySize);

export default router;
