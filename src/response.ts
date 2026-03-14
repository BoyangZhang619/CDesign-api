import {Response} from 'express';

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
    return res.status(status).json({
        success: true,
        message,
        data: null
    })
}