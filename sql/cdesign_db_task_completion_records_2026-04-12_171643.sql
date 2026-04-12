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
-- Table structure for table `task_completion_records`
--

DROP TABLE IF EXISTS `task_completion_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_completion_records` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `task_id` bigint DEFAULT NULL COMMENT '任务ID（可为NULL，用于删除的任务）',
  `task_title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务标题（快照）',
  `task_type` enum('checkin_exercise','checkin_meal','checkin_sleep','custom','ai_suggested') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务类型',
  `category` enum('diet','exercise','sleep','custom') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'custom' COMMENT '任务类别',
  `preset_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '预设类型',
  `task_priority` enum('high','medium','low') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium' COMMENT '优先级',
  `completion_date` date NOT NULL COMMENT '完成日期',
  `completion_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
  `due_date` date DEFAULT NULL COMMENT '原始截止日期',
  `category_icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类图标',
  `completion_status` enum('on_time','late','early') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'on_time' COMMENT '完成状态（准时/迟到/提前）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_completion_date` (`user_id`,`completion_date`),
  KEY `idx_user_task_type` (`user_id`,`task_type`),
  KEY `idx_completion_date` (`completion_date`),
  KEY `idx_user_category` (`user_id`,`category`),
  CONSTRAINT `task_completion_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务完成记录表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:16:46
