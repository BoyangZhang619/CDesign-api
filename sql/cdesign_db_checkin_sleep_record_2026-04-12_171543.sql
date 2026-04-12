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
-- Table structure for table `checkin_sleep_record`
--

DROP TABLE IF EXISTS `checkin_sleep_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_sleep_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` bigint NOT NULL COMMENT '关联daily_checkin.id',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `sleep_start_time` datetime DEFAULT NULL COMMENT '入睡时间',
  `wake_up_time` datetime DEFAULT NULL COMMENT '起床时间',
  `sleep_duration_hours` decimal(4,2) DEFAULT NULL COMMENT '睡眠时长',
  `sleep_quality_score` int DEFAULT NULL COMMENT 'ai给的睡眠质量评分，0-100',
  `is_nap` tinyint DEFAULT '0' COMMENT '是否是小憩',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `wake_up_times` int(10) unsigned zerofill DEFAULT NULL COMMENT '睡眠中苏醒次数',
  `sleep_feeling` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '个人感觉',
  `suggestion` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给的建议',
  `evaluation` text COLLATE utf8mb4_unicode_ci COMMENT 'ai给这次睡眠的评价',
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `checkin_sleep_record_ibfk_1` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checkin_sleep_record_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡睡眠明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:15:46
