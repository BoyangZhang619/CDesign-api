/**
 * 时间工具函数 - 统一处理东八区(UTC+8)时间
 * 防止时区问题导致的时间偏差
 */

/**
 * 获取当前东八区时间的 ISO 字符串格式
 * @returns 格式为 "YYYY-MM-DD HH:mm:ss" 的时间字符串
 */
const timeZone = 8; // 东八区时区偏移（小时）

export function getCurrentTimeString(): string {
    return getTimeString(new Date());
}

/**
 * 获取当前东八区日期（YYYY-MM-DD 格式）
 * @returns 格式为 "YYYY-MM-DD" 的日期字符串
 */
export function getCurrentDateString(): string {
    return getDateString(new Date());
}

/**
 * 将 Date 对象转换为东八区时间字符串
 * @param date Date 对象
 * @returns 格式为 "YYYY-MM-DD HH:mm:ss" 的时间字符串
 */
export function getTimeString(date: Date): string {
    // 转换为东八区时间
    const utc8Date = new Date(date.getTime() + timeZone * 60 * 60 * 1000);
    const year = utc8Date.getUTCFullYear();
    const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc8Date.getUTCDate()).padStart(2, '0');
    const hours = String(utc8Date.getUTCHours()).padStart(2, '0');
    const minutes = String(utc8Date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(utc8Date.getUTCSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将 Date 对象转换为东八区日期字符串
 * @param date Date 对象
 * @returns 格式为 "YYYY-MM-DD" 的日期字符串
 */
export function getDateString(date: Date): string {
    // 转换为东八区时间
    const utc8Date = new Date(date.getTime() + timeZone * 60 * 60 * 1000);
    const year = utc8Date.getUTCFullYear();
    const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(utc8Date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * 获取 SQL 查询中使用的当前时间表达式
 * 用于 SQL 的 WHERE 子句中的日期比较
 * @returns SQL 日期字符串 (格式: "YYYY-MM-DD")
 */
export function getSQLCurrentDate(): string {
    return `DATE_ADD(NOW(), INTERVAL ${timeZone} HOUR)`;
}

/**
 * 获取 SQL 查询中使用的当前日期时间表达式
 * 用于 SQL 的日期时间比较
 * @returns SQL 日期时间字符串
 */
export function getSQLCurrentDateTime(): string {
    return `DATE_ADD(NOW(), INTERVAL ${timeZone} HOUR)`;
}

/**
 * 将 JavaScript Date 转换为 MySQL 可以直接插入的格式
 * @param date Date 对象
 * @returns 格式为 "YYYY-MM-DD HH:mm:ss" 的字符串
 */
export function toMySQLDateTime(date: Date = new Date()): string {
    return getTimeString(date);
}

/**
 * 将 JavaScript Date 转换为 MySQL 日期格式
 * @param date Date 对象
 * @returns 格式为 "YYYY-MM-DD" 的字符串
 */
export function toMySQLDate(date: Date = new Date()): string {
    return getDateString(date);
}

/**
 * 解析 MySQL 返回的时间字符串为本地东八区时间
 * MySQL 返回的时间已经是东八区时间字符串，直接返回
 * @param mysqlTimeString MySQL 返回的时间字符串
 * @returns 原样返回（MySQL 已经返回东八区时间）
 */
export function fromMySQLDateTime(mysqlTimeString: string): string {
    // MySQL 中已经存储的是东八区时间，直接返回
    return mysqlTimeString;
}

/**
 * 获取当前时间戳（毫秒）
 * @returns 当前时间戳
 */
export function getCurrentTimestamp(): number {
    return Date.now();
}

/**
 * 格式化输出时间（便于日志记录）
 * @param date Date 对象或时间字符串
 * @returns 格式化的时间字符串
 */
export function formatDateTime(date: Date | string): string {
    if (typeof date === 'string') {
        return date; // 已经是字符串格式，直接返回
    }
    return getTimeString(date);
}
