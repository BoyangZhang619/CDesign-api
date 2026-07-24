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

router.use(authMiddleware);

// 创建新头像
router.post("/avatar", createAvatar);

// 获取用户所有头像
router.get("/avatar", getAvatarsByUser);

// 获取指定大小的所有头像
router.get("/avatar/size", getAvatarBySize);

// 获取当前使用的头像（按大小）
router.get("/avatar/current", getCurrentAvatar);

// 设置为当前使用的头像
router.put("/avatar/:avatarId/current", setCurrentAvatar);

// 删除特定头像
router.delete("/avatar/:avatarId", deleteAvatar);

// 删除指定大小的所有头像
router.delete("/avatar/size", deleteAvatarsBySize);

export default router;
