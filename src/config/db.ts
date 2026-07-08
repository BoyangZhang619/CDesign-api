import mysql, { RowDataPacket, OkPacket, ResultSetHeader } from 'mysql2/promise';
import env from './env.js';

// 类型安全的查询结果：以 RowDataPacket[] 为主，兼容写操作返回
type QueryResultRow<T = RowDataPacket> = T[];
type QueryResultRows<T = RowDataPacket> = [T[], any];

const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+08:00',
    dateStrings: true,
});

/**
 * 类型安全的 SQL 查询封装。
 * 自动将 mysql2 的 QueryResult 转为 `[rows[], fields]`，消除 `[0]` 索引类型错误。
 */
export async function dbQuery<T = RowDataPacket>(
    sql: string,
    params?: any[]
): Promise<QueryResultRows<T>> {
    const result = await pool.query(sql, params);
    return result as unknown as QueryResultRows<T>;
}

export default pool;
