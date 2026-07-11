-- ============================================================
-- Views 01: AI 聊天统计视图
-- ============================================================

-- ── v_ai_chat_session_stats: 会话级统计 ──
CREATE OR REPLACE VIEW `v_ai_chat_session_stats` AS
SELECT
  s.id AS session_id,
  s.uuid,
  s.user_id,
  s.session_name,
  s.ai_model,
  s.message_count,
  s.total_input_tokens,
  s.total_output_tokens,
  s.total_tokens,
  s.is_active,
  s.is_starred,
  s.last_message_at,
  COUNT(m.id) AS actual_message_count,
  SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END) AS user_message_count,
  SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) AS assistant_message_count,
  s.created_at
FROM ai_chat_sessions s
LEFT JOIN ai_chat_messages m ON s.id = m.session_id AND m.is_deleted = 0
GROUP BY s.id;

-- ── v_ai_user_chat_stats: 用户级统计 ──
CREATE OR REPLACE VIEW `v_ai_user_chat_stats` AS
SELECT
  s.user_id,
  COUNT(DISTINCT s.id) AS total_sessions,
  COUNT(DISTINCT m.id) AS total_messages,
  SUM(s.total_input_tokens) AS total_input_tokens,
  SUM(s.total_output_tokens) AS total_output_tokens,
  SUM(s.total_tokens) AS total_tokens,
  AVG(s.total_tokens) AS avg_tokens_per_session,
  MAX(s.last_message_at) AS last_activity_time
FROM ai_chat_sessions s
LEFT JOIN ai_chat_messages m ON s.id = m.session_id AND m.is_deleted = 0
GROUP BY s.user_id;
