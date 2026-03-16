import express, {Router} from 'express';
import type {Response, Request} from "express";
import {sendError, sendResult} from "../util/response.js";
import {DB, generateDBconfig} from "../util/db.js";

const router:Router = express.Router({mergeParams: true})

router.post('/', async (req:Request, res:Response) => {
    const {body} = req;
    if (body == null) return sendError(res, "POST请求无数据", 400);
    const sql: string = body.sql;
    if (sql == null) return sendError(res, "POST请求sql语句为空", 400);
    const params: string[] | number[] = body.params;
    try {
        const db = new DB(generateDBconfig());
        console.log(generateDBconfig(), body);
        const jsonText = await db.query(sql, params);
        sendResult(res, jsonText);
    } catch (error) {
        sendError(res)
    }
})

export default router;