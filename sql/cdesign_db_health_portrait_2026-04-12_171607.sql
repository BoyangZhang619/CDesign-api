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
-- Table structure for table `health_portrait`
--

DROP TABLE IF EXISTS `health_portrait`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `health_portrait` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `exercise_score` int NOT NULL DEFAULT '0' COMMENT '运动评分 (0-100)',
  `meal_score` int NOT NULL DEFAULT '0' COMMENT '饮食评分 (0-100)',
  `sleep_score` int NOT NULL DEFAULT '0' COMMENT '睡眠评分 (0-100)',
  `overall_score` int NOT NULL DEFAULT '0' COMMENT '总体评分 (0-100)',
  `bmi` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT 'BMI指数',
  `bmi_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT 'BMI状态: underweight|normal|overweight|obese',
  `cardio_level` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '一般' COMMENT '心肺功能等级描述',
  `cardio_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '心肺功能状态: excellent|good|normal|poor',
  `metabolism` int NOT NULL DEFAULT '0' COMMENT '代谢指数 (0-100)',
  `metabolism_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '代谢状态: high|normal|low',
  `sleep_quality` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '一般' COMMENT '睡眠质量描述',
  `sleep_quality_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal' COMMENT '睡眠质量状态: excellent|good|normal|poor',
  `radar_data` json DEFAULT NULL COMMENT '雷达图数据: {exercise, meal, sleep, cardio, metabolism, stressManagement}',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='健康画像表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:16:11
