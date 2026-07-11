# 数据库 Schema 文件索引

基准文件：`total_database_full.sql`（`mysqldump --routines --triggers --events` 全量导出，2026-07-11）

## 目录结构

```
sql/
├── total_database_full.sql          # 基准全量导出（原始，不可直接修改）
├── README.md                         # 本文件
│
├── migration/                        # 增量迁移脚本（按编号顺序执行）
│   ├── 001_drop_unused_tables.sql    # 删除无引用的废弃表
│   └── 002_fix_schema_issues.sql     # 修复类型/索引/外键等结构问题
│
├── schema/                           # 按功能域拆分的 DDL（生成的参考文件）
│   ├── 01_users.sql                  # user_account, user_profile, user_settings, refresh_tokens
│   ├── 02_checkin.sql                # daily_checkin, checkin_*_record, checkin_records, checkin_ai_summary
│   ├── 03_ai_chat.sql                # ai_chat_sessions, ai_chat_messages
│   ├── 04_health.sql                 # health_portrait, health_profile_setup, health_recommendations, health_timeline
│   ├── 05_tasks.sql                  # tasks, task_completion_records, task_statistics
│   └── 06_avatars.sql                # character_avatar, pixel_avatars
│
└── views/                            # 视图定义
    ├── 01_ai_chat_views.sql          # v_ai_chat_session_stats, v_ai_user_chat_stats
    └── 02_task_views.sql             # v_task_completion_stats_by_date, v_task_completion_stats_by_type
```

## 变更记录

### 2026-07-11 — 数据库结构化重整
- **删除废弃表**：`checkin_daily`, `checkin_exercise`, `checkin_meal`, `checkin_sleep`, `digital_twin_profile`, `notification_message`, `goal_progress_log`, `health_goal`（8张，均无代码引用）
- **修复 checkin_ai_summary**：FK 从 `checkin_records` 迁移到 `daily_checkin`，列从规范化设计改为业务实际使用的分列设计
- **删除重复索引**：`ai_chat_sessions.uuid` (与 `uk_uuid` 重复)
- **修复数据类型**：`daily_checkin.sleep_start_time` TEXT→DATETIME, `mood` VARCHAR→TINYINT, `sleep_quality` VARCHAR→TINYINT
- **修复 checkin_sleep_record.wake_up_times**：int(10) unsigned zerofill → INT
- **补充 character_avatar.updated_at**
- **添加复合索引**：`checkin_*_record.(user_id, created_at)`

### 2026-07-11 — 打卡系统重构
- 删除旧 `checkinRouters.ts` + `checkinController.ts`
- CheckinView.vue 全部 API 调用迁移到 V2 端点

## 发布流程

```bash
# 1. 在测试环境执行迁移
mysql -u user -p cdesign_db < sql/migration/001_drop_unused_tables.sql
mysql -u user -p cdesign_db < sql/migration/002_fix_schema_issues.sql

# 2. 验证
mysql -u user -p cdesign_db -e "SHOW TABLES;"
mysql -u user -p cdesign_db -e "SHOW FULL COLUMNS FROM checkin_ai_summary;"

# 3. 更新基准导出
mysqldump -u user -p --routines --triggers --events --add-drop-table --single-transaction --default-character-set=utf8mb4 cdesign_db > sql/total_database_full.sql
```
