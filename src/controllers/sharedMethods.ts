import { Request } from "express";
import pool from "../config/db.js";


function getUserIdFromReq(req: Request): number {
    if (!req.user || !req.user.userId) {
        throw new Error('未授权或用户信息无效');
    }
    return req.user.userId;
}

interface UserRow {
    id: number;
    email: string;
    password_hash: string;
    status: number;
    admin: number;
    credits: number;
}

async function getUserById(userId: number): Promise<UserRow | null> {
    const [rows] = await pool.query(
        'SELECT id, credits FROM user_account WHERE id = ? LIMIT 1',
        [userId]
    );
    const userRows = rows as UserRow[];
    if (!Array.isArray(userRows) || userRows.length === 0) {
        return null;
    }
    return userRows[0];
}

export {
    getUserIdFromReq,
    getUserById
};