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
-- Table structure for table `checkin_exercise_record`
--

DROP TABLE IF EXISTS `checkin_exercise_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_exercise_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` bigint NOT NULL COMMENT '关联daily_checkin.id',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `activity_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跑步/步行/力量训练/球类等',
  `duration_min` int DEFAULT NULL COMMENT '时长',
  `intensity` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'low/medium/high',
  `calories_burned` decimal(10,2) DEFAULT NULL COMMENT 'ai给到的估算消耗热量',
  `start_time` datetime DEFAULT NULL COMMENT '开始时间',
  `end_time` datetime DEFAULT NULL COMMENT '结束时间',
  `note` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `ai_recognition_flag` tinyint DEFAULT NULL COMMENT '是否AI辅助',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `suggestion` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给的建议',
  `evaluation` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给的评价',
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `checkin_exercise_record_ibfk_1` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checkin_exercise_record_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡运动明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:15:32
