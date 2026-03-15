import * as mysql from 'mysql2/promise'

interface DBconfig {
    host: string;
    user: string;
    password: string;
    database: string;
    port: number;
}

const MYSQL_PORT = process.env.MYSQL_PORT || process.env.MYSQLPORT;
const MYSQL_USER = process.env.MYSQL_USERNAME || process.env.MYSQLUSERNAME;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD;
const MYSQL_HOST = process.env.MYSQL_HOST || process.env.MYSQLHOST;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE;

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