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
-- Table structure for table `checkin_meal_record`
--

DROP TABLE IF EXISTS `checkin_meal_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checkin_meal_record` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `daily_checkin_id` bigint NOT NULL COMMENT '关联daily_checkin.id',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `meal_type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'breakfast/lunch/dinner/snack',
  `food_source` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'canteen/takeout/dormitory/other',
  `food_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '食物名称或套餐名称',
  `food_detail` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '食物明细，可json文本',
  `calories` decimal(10,2) DEFAULT NULL COMMENT '热量',
  `protein_g` decimal(10,2) DEFAULT NULL COMMENT '蛋白质',
  `fat_g` decimal(10,2) DEFAULT NULL COMMENT '脂肪',
  `carbohydrate_g` decimal(10,2) DEFAULT NULL COMMENT '碳水',
  `fiber_g` decimal(10,2) DEFAULT NULL COMMENT '膳食纤维，可选',
  `sugar_g` decimal(10,2) DEFAULT NULL COMMENT '糖分，可选',
  `meal_time` datetime DEFAULT NULL COMMENT '用餐时间',
  `ai_recognition_flag` tinyint DEFAULT NULL COMMENT '是否来自AI识别',
  `image_id` bigint DEFAULT NULL COMMENT '关联上传图片，可空',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_daily_checkin_id` (`daily_checkin_id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `checkin_meal_record_ibfk_1` FOREIGN KEY (`daily_checkin_id`) REFERENCES `daily_checkin` (`id`) ON DELETE CASCADE,
  CONSTRAINT `checkin_meal_record_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user_account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打卡饮食明细表';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-12 17:15:37
