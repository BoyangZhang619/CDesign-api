import { Request, Response } from 'express';
import { dbQuery } from '../config/db.js';
import { sendResult, sendError } from '../util/response.js';

// ── 创建打卡 ────────────────────────────────────────────────
async function createCheckin(req: Request, res: Response): Promise<Response> {
  const userId = req.user.userId;
  const { checkin_type, subtype, checkin_date, notes, details } = req.body;
  if (!checkin_type || !checkin_date) return sendError(res, '缺少 checkin_type 或 checkin_date', 400);

  try {
    const [result] = await dbQuery(
      'INSERT INTO checkin_records (user_id, checkin_type, subtype, checkin_date, notes) VALUES (?,?,?,?,?)',
      [userId, checkin_type, subtype || null, checkin_date, notes || null]
    );
    const recordId = (result as any).insertId;

    // 写入类型详情表
    if (details && recordId) {
      switch (checkin_type) {
        case 'meal':
          await dbQuery(
            `INSERT INTO checkin_meal (record_id,meal_period,food_name,food_source,calories,protein_g,fat_g,carb_g,fiber_g,sugar_g,water_ml)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [recordId, details.meal_period, details.food_name, details.food_source, details.calories||0,
             details.protein_g||0, details.fat_g||0, details.carb_g||0, details.fiber_g||0, details.sugar_g||0, details.water_ml||0]
          ); break;
        case 'exercise':
          await dbQuery(
            `INSERT INTO checkin_exercise (record_id,activity_type,duration_min,intensity,calories_burned,distance_km,heart_rate_avg,heart_rate_max)
             VALUES (?,?,?,?,?,?,?,?)`,
            [recordId, details.activity_type, details.duration_min||0, details.intensity||'medium',
             details.calories_burned||0, details.distance_km||null, details.heart_rate_avg||null, details.heart_rate_max||null]
          ); break;
        case 'sleep':
          await dbQuery(
            `INSERT INTO checkin_sleep (record_id,sleep_type,start_time,end_time,duration_hours,quality,wake_count,dream_notes)
             VALUES (?,?,?,?,?,?,?,?)`,
            [recordId, details.sleep_type||'night', details.start_time, details.end_time,
             details.duration_hours||0, details.quality||3, details.wake_count||0, details.dream_notes||null]
          ); break;
        case 'daily':
          await dbQuery(
            `INSERT INTO checkin_daily (record_id,activity_category,mood,energy,description,water_ml)
             VALUES (?,?,?,?,?,?)`,
            [recordId, details.activity_category||'other', details.mood||null, details.energy||null,
             details.description||null, details.water_ml||0]
          ); break;
      }
    }
    return sendResult(res, { id: recordId, message: '打卡成功' });
  } catch (err: unknown) {
    return sendError(res, '创建失败: ' + (err as Error).message, 500);
  }
}

// ── 获取打卡列表（支持类型+日期筛选） ────────────────────────
async function getCheckins(req: Request, res: Response): Promise<Response> {
  const userId = req.user.userId;
  const { type, date, limit } = req.query;
  try {
    let sql = 'SELECT * FROM checkin_records WHERE user_id = ?';
    const params: any[] = [userId];
    if (type) { sql += ' AND checkin_type = ?'; params.push(type); }
    if (date) { sql += ' AND checkin_date = ?'; params.push(date); }
    sql += ' ORDER BY created_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(Number(limit)); }
    const [rows] = await dbQuery(sql, params);
    return sendResult(res, { records: rows });
  } catch (err: unknown) {
    return sendError(res, '查询失败: ' + (err as Error).message, 500);
  }
}

// ── 获取单条打卡详情 ────────────────────────────────────────
async function getCheckinDetail(req: Request, res: Response): Promise<Response> {
  const userId = req.user.userId;
  const { id } = req.params;
  try {
    const [rows] = await dbQuery('SELECT * FROM checkin_records WHERE id=? AND user_id=?', [id, userId]);
    if (!(rows as any[]).length) return sendError(res, '记录不存在', 404);
    const record = (rows as any[])[0];
    let details = null;
    switch (record.checkin_type) {
      case 'meal': { const [r] = await dbQuery('SELECT * FROM checkin_meal WHERE record_id=?', [id]); details = (r as any[])[0] || null; break; }
      case 'exercise': { const [r] = await dbQuery('SELECT * FROM checkin_exercise WHERE record_id=?', [id]); details = (r as any[])[0] || null; break; }
      case 'sleep': { const [r] = await dbQuery('SELECT * FROM checkin_sleep WHERE record_id=?', [id]); details = (r as any[])[0] || null; break; }
      case 'daily': { const [r] = await dbQuery('SELECT * FROM checkin_daily WHERE record_id=?', [id]); details = (r as any[])[0] || null; break; }
    }
    return sendResult(res, { record, details });
  } catch (err: unknown) {
    return sendError(res, '查询失败: ' + (err as Error).message, 500);
  }
}

// ── 今日概况 ────────────────────────────────────────────────
async function getTodaySummary(req: Request, res: Response): Promise<Response> {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];
  try {
    const [rows] = await dbQuery(
      'SELECT checkin_type, COUNT(*) as count FROM checkin_records WHERE user_id=? AND checkin_date=? GROUP BY checkin_type',
      [userId, today]
    );
    const counts: Record<string,number> = { daily:0, meal:0, exercise:0, sleep:0 };
    (rows as any[]).forEach(r => { counts[r.checkin_type] = r.count; });
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    return sendResult(res, { date: today, total, byType: counts });
  } catch (err: unknown) {
    return sendError(res, '查询失败: ' + (err as Error).message, 500);
  }
}

export { createCheckin, getCheckins, getCheckinDetail, getTodaySummary };
