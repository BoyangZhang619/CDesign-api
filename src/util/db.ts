import * as mysql from 'mysql2/promise'
import env from '../config/env.js';

interface DBconfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
}

const MYSQL_PORT = env.db.port;
const MYSQL_USER = env.db.user;
const MYSQL_PASSWORD = env.db.password;
const MYSQL_HOST = env.db.host;
const MYSQL_DATABASE = env.db.database;

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

export {
    DBconfig,
    DB,
    generateDBconfig,
    MYSQL_PORT,
    MYSQL_DATABASE,
    MYSQL_PASSWORD,
    MYSQL_HOST,
    MYSQL_USER
}