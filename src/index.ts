import * as dotenv from 'dotenv';
import express from 'express';
import {generateDBconfig, DB} from './util/db.js'
import cors from 'cors';
import process from 'process';
import {sendResult, sendError} from './util/response.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/chat', chatRouter)
const PORT = Number(process.env.PORT || 8080);
console.log('PORT =', process.env.PORT);

app.post('/sql', async (req: any, res: any) => {
    const {body} = req;
    if (body == null) return sendError(res, "POST请求无数据", 400);
    const sql: string = body.sql;
    if (sql == null) return sendError(res, "POST请求sql语句为空", 400);
    const params: string[] | number[] = body.params;
    try {
        const db = new DB(generateDBconfig());
        console.log(generateDBconfig(), body);
        const jsonText = await db.query(sql, params);
        console.log(jsonText);
        sendResult(res, jsonText);
    } catch (error) {
        console.error(error.message);
        sendError(res)
    }
})


app.listen(PORT, '0.0.0.0', () => {
    console.log(`正在监听端口${PORT}`);
})