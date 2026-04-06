-- 健康画像表
-- 存储用户的综合健康评分和身体指标

CREATE TABLE IF NOT EXISTS health_portrait (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  
  -- 三大维度评分
  exercise_score INT NOT NULL DEFAULT 0 COMMENT '运动评分 (0-100)',
  meal_score INT NOT NULL DEFAULT 0 COMMENT '饮食评分 (0-100)',
  sleep_score INT NOT NULL DEFAULT 0 COMMENT '睡眠评分 (0-100)',
  overall_score INT NOT NULL DEFAULT 0 COMMENT '总体评分 (0-100)',
  
  -- 身体指标
  bmi DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'BMI指数',
  bmi_status VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT 'BMI状态: underweight|normal|overweight|obese',
  
  cardio_level VARCHAR(100) NOT NULL DEFAULT '一般' COMMENT '心肺功能等级描述',
  cardio_status VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT '心肺功能状态: excellent|good|normal|poor',
  
  metabolism INT NOT NULL DEFAULT 0 COMMENT '代谢指数 (0-100)',
  metabolism_status VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT '代谢状态: high|normal|low',
  
  sleep_quality VARCHAR(100) NOT NULL DEFAULT '一般' COMMENT '睡眠质量描述',
  sleep_quality_status VARCHAR(50) NOT NULL DEFAULT 'normal' COMMENT '睡眠质量状态: excellent|good|normal|poor',
  
  -- 雷达图数据（JSON格式存储）
  radar_data JSON COMMENT '雷达图数据: {exercise, meal, sleep, cardio, metabolism, stressManagement}',
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY uk_user_id (user_id),
  KEY idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康画像表';

-- 健康建议表
-- 存储系统生成的个性化健康建议

CREATE TABLE IF NOT EXISTS health_recommendations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  
  icon VARCHAR(10) NOT NULL DEFAULT '💡' COMMENT 'Emoji 图标',
  title VARCHAR(100) NOT NULL COMMENT '建议标题',
  description TEXT NOT NULL COMMENT '建议详情',
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' COMMENT '优先级: high|medium|low',
  
  -- 源数据
  source_type VARCHAR(50) COMMENT '建议来源: exercise|meal|sleep|cardio|stress|water',
  source_score INT COMMENT '源指标的评分',
  
  -- 元数据
  is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否活跃',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_user_id (user_id),
  KEY idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康建议表';

-- 健康进度时间轴表
-- 记录用户的健康成就和进度里程碑

CREATE TABLE IF NOT EXISTS health_timeline (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  
  event_date DATE NOT NULL COMMENT '事件日期',
  title VARCHAR(100) NOT NULL COMMENT '事件标题',
  description TEXT NOT NULL COMMENT '事件描述',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT '状态: completed|in-progress|pending',
  
  -- 事件类型
  event_type VARCHAR(50) COMMENT '事件类型: profile_init|exercise_milestone|meal_milestone|sleep_milestone|overall_achievement|streak|custom',
  
  -- 关联的指标
  related_score_type VARCHAR(50) COMMENT '相关评分类型: exercise|meal|sleep|overall',
  related_score_value INT COMMENT '相关的评分值',
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  KEY idx_user_id (user_id),
  KEY idx_event_date (event_date),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康进度时间轴表';

-- 健康档案设置状态表
-- 记录用户是否完成健康档案设置

CREATE TABLE IF NOT EXISTS health_profile_setup (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL COMMENT '用户ID',
  
  is_completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已完成设置',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  
  -- 各步骤完成状态
  basic_info_completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '基础信息是否已填写',
  health_exam_completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '体检数据是否已上传',
  health_goals_completed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '健康目标是否已设定',
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  UNIQUE KEY uk_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康档案设置状态表';
