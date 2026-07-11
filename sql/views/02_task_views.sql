-- ============================================================
-- Views 02: 任务统计视图
-- ============================================================

-- ── v_task_completion_stats_by_date: 按日期统计完成率 ──
CREATE OR REPLACE VIEW `v_task_completion_stats_by_date` AS
SELECT
  user_id,
  completed_date AS stat_date,
  COUNT(*) AS completed_count
FROM task_completion_records
GROUP BY user_id, completed_date;

-- ── v_task_completion_stats_by_type: 按类型统计完成率 ──
CREATE OR REPLACE VIEW `v_task_completion_stats_by_type` AS
SELECT
  user_id,
  task_type,
  COUNT(*) AS completed_count,
  MIN(completed_date) AS first_completed,
  MAX(completed_date) AS last_completed
FROM task_completion_records
WHERE task_type IS NOT NULL
GROUP BY user_id, task_type;
