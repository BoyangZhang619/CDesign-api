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
-- Table structure for table `checkin_ai_summary`
--

DROP TABLE IF EXISTS `checkin_ai_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_ai_summary` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `daily_checkin_id` bigint NOT NULL COMMENT '关联的daily_checkin表的ID',
  `meal_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `exercise_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `sleep_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `total_ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'AI分析总结',
  `is_meal_summary_updated` tinyint(1) DEFAULT '0' COMMENT '餐饮总结是否已更新',
  `is_exercise_summary_updated` tinyint(1) DEFAULT '0' COMMENT '运动总结是否已更新',
  `is_sleep_summary_updated` tinyint(1) DEFAULT '0' COMMENT '睡眠总结是否已更新',
  `is_total_summary_updated` tinyint(1) DEFAULT '0' COMMENT '整体总结是否已更新',
  PRIMARY KEY (`id`),
  KEY `dc_daily_ai_summary` (`daily_checkin_id`),
  CONSTRAINT `dc_daily_ai_summary` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:15:26
