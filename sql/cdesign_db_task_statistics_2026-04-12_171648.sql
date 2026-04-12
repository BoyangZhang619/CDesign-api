-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: cdesign_db
-- ------------------------------------------------------
-- Server version	8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `task_statistics`
--

DROP TABLE IF EXISTS `task_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_statistics` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '统计ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `statistic_date` date NOT NULL COMMENT '统计日期',
  `total` int unsigned DEFAULT '0' COMMENT '总任务数',
  `completed` int unsigned DEFAULT '0' COMMENT '已完成数',
  `pending` int unsigned DEFAULT '0' COMMENT '待完成数',
  `overdue` int unsigned DEFAULT '0' COMMENT '逾期数',
  `completion_rate` decimal(5,2) DEFAULT '0.00' COMMENT '完成率',
  `checkin_exercise_count` int unsigned DEFAULT '0' COMMENT '运动打卡数',
  `checkin_meal_count` int unsigned DEFAULT '0' COMMENT '饮食打卡数',
  `diet_count` int unsigned DEFAULT '0' COMMENT '饮食任务数',
  `exercise_count` int unsigned DEFAULT '0' COMMENT '运动任务数',
  `sleep_count` int unsigned DEFAULT '0' COMMENT '睡眠任务数',
  `preset_count` int unsigned DEFAULT '0' COMMENT '预设任务数',
  `diet_completed` int unsigned DEFAULT '0' COMMENT '饮食已完成数',
  `exercise_completed` int unsigned DEFAULT '0' COMMENT '运动已完成数',
  `sleep_completed` int unsigned DEFAULT '0' COMMENT '睡眠已完成数',
  `preset_completed` int unsigned DEFAULT '0' COMMENT '预设已完成数',
  `checkin_sleep_count` int unsigned DEFAULT '0' COMMENT '睡眠打卡数',
  `custom_count` int unsigned DEFAULT '0' COMMENT '自定义任务数',
  `ai_suggested_count` int unsigned DEFAULT '0' COMMENT 'AI建议任务数',
  `high_priority_count` int unsigned DEFAULT '0' COMMENT '高优先级数',
  `medium_priority_count` int unsigned DEFAULT '0' COMMENT '中优先级数',
  `low_priority_count` int unsigned DEFAULT '0' COMMENT '低优先级数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`,`statistic_date`),
  KEY `idx_user_date` (`user_id`,`statistic_date`),
  CONSTRAINT `task_statistics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务统计表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:16:51
