import * as dotenv from 'dotenv';
import express from 'express';
// import OpenAI from "openai";
import cors from 'cors';
// import type {ChatCompletionMessageParam} from "openai/resources/chat/completions";
import process from 'process';
import * as mysql from 'mysql2/promise';
import {sendResult, sendError} from './response.js';
import chatRouter from './chat.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/chat', chatRouter)
const PORT = Number(process.env.PORT || 8080);
console.log('PORT =', process.env.PORT);
const CONSOLE_OPEN = process.env.CONSOLE_OPEN;
const MYSQL_PORT = process.env.MYSQL_PORT || process.env.MYSQLPORT;
const MYSQL_USER = process.env.MYSQL_USERNAME || process.env.MYSQLUSERNAME;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD;
const MYSQL_HOST = process.env.MYSQL_HOST || process.env.MYSQLHOST;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE;

// const openai = new OpenAI({
//     apiKey: process.env.DASHSCOPE_API_KEY, // 从环境变量读取
//     baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
// });

interface DBconfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
}

function generateDBconfig(host = MYSQL_HOST, user = MYSQL_USER, password = MYSQL_PASSWORD, database = MYSQL_DATABASE, port = Number(MYSQL_PORT)) {
    return {host, user, password, database, port}
}

class DB {
    private readonly DBconfig: DBconfig;
    private Pool: mysql.Pool;

    constructor(DBconfig: DBconfig) {
        this.DBconfig = DBconfig;
    }

    connect(): mysql.Pool {
        this.Pool = mysql.createPool(this.DBconfig);
        return this.Pool;
    }

    async query(sql: string, params: any[]) {
        if (this.Pool == null) this.connect();
        const connection: mysql.Pool = this.Pool;
        try {
            const [rows] = await connection.query(sql, params);
            console.log(rows);
            return rows;
        } catch (error) {
            console.error("DB -> query -> try :", error.message);
        }
        return [];
    }
}

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

// 初始化 openai 客户端
// async function main() {
//     try {
//         const messages: ChatCompletionMessageParam[] = [{
//             role: "system",
//             content: "You are a helpful assistant."
//         }, {role: 'user', content: '你是谁'}];
//         // @ts-ignore
//         const stream = await openai.chat.completions.create({
//             model: 'qwen3.5-flash',
//             messages,
//             stream: true,
//             enable_thinking: true
//         });
//         console.log('\n' + '='.repeat(20) + '思考过程' + '='.repeat(20));
//         type ReasoningDelta = {
//             content?: string | null,
//             reasoning_content?: string | null
//         }
//         for await (const chunk of stream) {
//             const delta = chunk.choices[0].delta as ReasoningDelta;
//             if (delta.reasoning_content !== undefined && delta.reasoning_content !== null) {
//                 if (!isAnswering) {
//                     process.stdout.write(delta.reasoning_content);
//                 }
//             }
//             if (delta.content !== undefined && delta.content) {
//                 if (!isAnswering) {
//                     console.log('\n' + '='.repeat(20) + '完整回复' + '='.repeat(20));
//                     isAnswering = true;
//                 }
//                 process.stdout.write(delta.content);
//             }
//         }
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }
//
// main();

// type ReasoningDelta = {
//     content?: string | null,
//     reasoning_content?: string | null
// }

// app.post('/chat', async (req, res) => {
//     try {
//         const userMessage = req.body?.message;
//
//         if (!userMessage || typeof userMessage !== 'string') {
//             return res.status(400).json({ error: 'message 必填，且必须是字符串' });
//         }
//
//         const messages: ChatCompletionMessageParam[] = [
//             { role: 'system', content: 'You are a helpful assistant.' },
//             { role: 'user', content: userMessage }
//         ];
//
//         const completion = await openai.chat.completions.create({
//             model: 'qwen3.5-flash',
//             messages,
//             // @ts-ignore
//             extra_body: {
//                 enable_thinking: true
//             }
//         });
//
//         const text = completion.choices?.[0]?.message?.content ?? '';
//
//         return res.json({
//             ok: true,
//             model: completion.model,
//             content: text,
//             raw: completion
//         });
//     } catch (error: any) {
//         console.error(error);
//         return res.status(500).json({
//             ok: false,
//             error: error?.message || 'server error'
//         });
//     }
// });
//
// app.post('/chat/stream', async (req, res) => {
//     try {
//         const userMessage = req.body?.message;
//
//         if (!userMessage || typeof userMessage !== 'string') {
//             return res.status(400).json({ error: 'message 必填，且必须是字符串' });
//         }
//
//         const messages: ChatCompletionMessageParam[] = [
//             { role: 'system', content: 'You are a helpful assistant.' },
//             { role: 'user', content: userMessage }
//         ];
//
//         res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
//         res.setHeader('Cache-Control', 'no-cache, no-transform');
//         res.setHeader('Connection', 'keep-alive');
//
//         // @ts-ignore
//         const stream = await openai.chat.completions.create({
//             model: 'qwen3.5-flash',
//             messages,
//             stream: true,
//             extra_body: {
//                 enable_thinking: true
//             }
//         });
//
//         for await (const chunk of stream) {
//             const delta = chunk.choices?.[0]?.delta as ReasoningDelta | undefined;
//             if (!delta) continue;
//
//             if (delta.reasoning_content) {
//                 res.write(`data: ${JSON.stringify({
//                     type: 'reasoning',
//                     content: delta.reasoning_content
//                 })}\n\n`);
//             }
//
//             if (delta.content) {
//                 res.write(`data: ${JSON.stringify({
//                     type: 'content',
//                     content: delta.content
//                 })}\n\n`);
//             }
//         }
//
//         res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
//         res.end();
//     } catch (error: any) {
//         console.error(error);
//         res.write(`data: ${JSON.stringify({
//             type: 'error',
//             error: error?.message || 'server error'
//         })}\n\n`);
//         res.end();
//     }
// });