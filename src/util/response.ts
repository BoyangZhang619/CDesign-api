import type {Response} from 'express';
import { getCurrentDateTimeString } from './dateTime.js';

/**
 * 统一的输出格式:
 * {
 * "success": boolean,
 * "data": any,
 * "message": string
 * }
 */

export const sendResult = (
    res: Response,
    data: any = null,
    message: string = "success",
    status: number = 200
) => {
    console.log(`\n\n==========\n[${getCurrentDateTimeString()}]运行正常，返回log,HTTP状态码：${status}，log信息：${message}\n==========\n\n`);
    return res.status(status).json({
        success: true,
        message,
        data
    })
};

export const sendError = (
    res: Response,
    message: string = "error",
    status: number = 500
) => {
    console.error(`\n\n==========\n[${getCurrentDateTimeString()}]出现错误，返回error,HTTP状态码：${status}，报错信息：${message}\n==========\n\n`);
    return res.status(status).json({
        success: false,
        message,
        data: null
    })
}