import * as dotenv from 'dotenv';
import express from 'express';
import * as mysql from 'mysql2/promise';

dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT;
const CONSOLE_OPEN = process.env.CONSOLE_OPEN;
const MYSQL_PORT = process.env.MYSQL_PORT || process.env.MYSQLPORT;
const MYSQL_USER = process.env.MYSQL_USER || process.env.MYSQLUSER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD;
const MYSQL_HOST = process.env.MYSQL_HOST || process.env.MYSQLHOST;
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

app.get('/mysqltry', async (req, res) => {
    console.log(generateDBconfig());
    const db = new DB(generateDBconfig());
    const jsonText = await db.query("select * from test0314 where id != ?;", [2]);
    console.log(jsonText)
    res.json(JSON.stringify(jsonText));
})

app.listen(PORT, () => {
    console.log(`正在监听端口${PORT}`);
})