import * as dotenv from 'dotenv';
import express from 'express';
import * as mysql from 'mysql2/promise';
import {sendResult, sendError} from './src/response.js';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT;
const CONSOLE_OPEN = process.env.CONSOLE_OPEN;
const MYSQL_PORT = 30768;
const MYSQL_USER = process.env.MYSQL_USER || process.env.MYSQLUSER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD;
const MYSQL_HOST = "43.134.234.229";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE;

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
    const {body} = req.body;
    if (body == null) return sendError(res, "POST请求无数据", 400);
    const sql: string = body.sql;
    if (sql == null) return sendError(res, "POST请求sql语句为空", 400);
    const params: string[] | number[] = body.params;
    try {
        const db = new DB(generateDBconfig());
        const jsonText = await db.query(sql, params);
        console.log(jsonText);
        sendResult(res, jsonText);
    } catch (error) {
        console.error(error.message);
        sendError(res)
    }
})

app.listen(PORT, () => {
    console.log(`正在监听端口${PORT}`);
})