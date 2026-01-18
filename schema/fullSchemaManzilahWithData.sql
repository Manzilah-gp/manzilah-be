-- MySQL dump 10.13  Distrib 8.4.5, for Win64 (x86_64)
--
-- Host: localhost    Database: manzilah
-- ------------------------------------------------------
-- Server version	8.4.5

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
-- Current Database: `manzilah`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `manzilah` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `manzilah`;

--
-- Table structure for table `ai_insights`
--

DROP TABLE IF EXISTS `ai_insights`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_insights` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `insight_type` enum('study_plan','progress_prediction','resource_recommendation','teacher_matching') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `confidence_score` decimal(3,2) DEFAULT NULL,
  `generated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_applied` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_insight_user` (`user_id`),
  KEY `idx_insight_type` (`insight_type`),
  CONSTRAINT `ai_insights_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_insights`
--

LOCK TABLES `ai_insights` WRITE;
/*!40000 ALTER TABLE `ai_insights` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_insights` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversation`
--

DROP TABLE IF EXISTS `conversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('private','group') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'private',
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Group name (only for group chats)',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Group description',
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Group profile picture',
  `created_by` int NOT NULL COMMENT 'User who created the conversation',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_at` (`updated_at`),
  CONSTRAINT `conversation_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversation`
--

LOCK TABLES `conversation` WRITE;
/*!40000 ALTER TABLE `conversation` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversation_participant`
--

DROP TABLE IF EXISTS `conversation_participant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversation_participant` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('member','admin') COLLATE utf8mb4_unicode_ci DEFAULT 'member' COMMENT 'Admin can manage group',
  `last_read_at` timestamp NULL DEFAULT NULL COMMENT 'For unread count',
  `is_muted` tinyint(1) DEFAULT '0' COMMENT 'Mute notifications',
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `left_at` timestamp NULL DEFAULT NULL COMMENT 'When user left group',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_participant` (`conversation_id`,`user_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_conversation` (`conversation_id`),
  KEY `idx_participant_user_conversation` (`user_id`,`conversation_id`),
  CONSTRAINT `conversation_participant_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversation_participant_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversation_participant`
--

LOCK TABLES `conversation_participant` WRITE;
/*!40000 ALTER TABLE `conversation_participant` DISABLE KEYS */;
/*!40000 ALTER TABLE `conversation_participant` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `conversation_with_latest_message`
--

DROP TABLE IF EXISTS `conversation_with_latest_message`;
/*!50001 DROP VIEW IF EXISTS `conversation_with_latest_message`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `conversation_with_latest_message` AS SELECT 
 1 AS `id`,
 1 AS `type`,
 1 AS `name`,
 1 AS `description`,
 1 AS `avatar_url`,
 1 AS `created_by`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `last_message`,
 1 AS `last_message_at`,
 1 AS `last_sender_id`,
 1 AS `last_sender_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `course`
--

DROP TABLE IF EXISTS `course`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mosque_id` int NOT NULL,
  `teacher_id` int DEFAULT NULL,
  `target_gender` enum('male','female') DEFAULT NULL,
  `course_type_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `course_format` enum('short','long') NOT NULL,
  `price_cents` int NOT NULL DEFAULT '0',
  `duration_weeks` int DEFAULT NULL,
  `total_sessions` int DEFAULT NULL,
  `max_students` int DEFAULT NULL,
  `schedule_type` enum('online','onsite','hybrid') DEFAULT 'onsite',
  `target_age_group` enum('children','teenagers','adults','all') DEFAULT 'all',
  `is_active` tinyint(1) DEFAULT '1',
  `course_level` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `enrollment_deadline` date DEFAULT NULL COMMENT 'Last date students can enroll',
  `course_start_date` date DEFAULT NULL COMMENT 'When course begins',
  `course_end_date` date DEFAULT NULL COMMENT 'When course ends',
  `online_meeting_url` varchar(500) DEFAULT NULL COMMENT 'Jitsi/Daily room URL',
  `is_online_enabled` tinyint(1) DEFAULT '0' COMMENT 'If true, course has online sessions',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `course_level` (`course_level`),
  KEY `idx_course_mosque` (`mosque_id`),
  KEY `idx_course_active` (`is_active`),
  KEY `idx_course_type` (`course_type_id`),
  KEY `idx_target_gender` (`target_gender`),
  KEY `fk_course_teacher` (`teacher_id`),
  KEY `idx_enrollment_deadline` (`enrollment_deadline`),
  KEY `idx_course_dates` (`course_start_date`,`course_end_date`),
  KEY `idx_course_active_deadline` (`is_active`,`enrollment_deadline`),
  KEY `idx_course_mosque_active` (`mosque_id`,`is_active`),
  CONSTRAINT `course_ibfk_1` FOREIGN KEY (`mosque_id`) REFERENCES `mosque` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_ibfk_2` FOREIGN KEY (`course_type_id`) REFERENCES `course_type` (`id`),
  CONSTRAINT `course_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`),
  CONSTRAINT `course_ibfk_4` FOREIGN KEY (`course_level`) REFERENCES `memorization_level` (`id`),
  CONSTRAINT `fk_course_teacher` FOREIGN KEY (`teacher_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Target gender for the course. NULL means mixed/no restriction';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course`
--

LOCK TABLES `course` WRITE;
/*!40000 ALTER TABLE `course` DISABLE KEYS */;
/*!40000 ALTER TABLE `course` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_attendance`
--

DROP TABLE IF EXISTS `course_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollment_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('present','absent','excused') NOT NULL,
  `notes` text,
  `recorded_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_attendance_record` (`enrollment_id`,`attendance_date`),
  KEY `recorded_by` (`recorded_by`),
  CONSTRAINT `course_attendance_ibfk_1` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_attendance_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_attendance`
--

LOCK TABLES `course_attendance` WRITE;
/*!40000 ALTER TABLE `course_attendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_material`
--

DROP TABLE IF EXISTS `course_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_material` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `section_id` int DEFAULT NULL,
  `uploaded_by` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `material_label` varchar(100) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` int DEFAULT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `download_count` int DEFAULT '0',
  `is_visible` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `local_url` varchar(500) NOT NULL COMMENT 'Relative URL path for file access',
  `local_path` varchar(500) NOT NULL COMMENT 'Server file system path',
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_course_materials` (`course_id`),
  KEY `idx_section` (`section_id`),
  CONSTRAINT `course_material_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_material_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `user` (`id`),
  CONSTRAINT `course_material_ibfk_3` FOREIGN KEY (`section_id`) REFERENCES `material_section` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_material`
--

LOCK TABLES `course_material` WRITE;
/*!40000 ALTER TABLE `course_material` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_material` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_schedule`
--

DROP TABLE IF EXISTS `course_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `day_of_week` enum('sunday','monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_course_schedule` (`course_id`),
  CONSTRAINT `course_schedule_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_schedule`
--

LOCK TABLES `course_schedule` WRITE;
/*!40000 ALTER TABLE `course_schedule` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_schedule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_type`
--

DROP TABLE IF EXISTS `course_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_type` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` enum('memorization','tajweed','feqh') NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_course_type` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_type`
--

LOCK TABLES `course_type` WRITE;
/*!40000 ALTER TABLE `course_type` DISABLE KEYS */;
INSERT INTO `course_type` VALUES (1,'memorization','Quran Memorization Courses'),(2,'tajweed','Tajweed and Recitation Rules'),(3,'feqh','Islamic Jurisprudence Studies');
/*!40000 ALTER TABLE `course_type` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donation`
--

DROP TABLE IF EXISTS `donation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `campaign_id` int NOT NULL,
  `donor_id` int NOT NULL,
  `amount_cents` int NOT NULL,
  `payment_id` int NOT NULL,
  `is_anonymous` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_donation_campaign` (`campaign_id`),
  KEY `idx_donation_donor` (`donor_id`),
  CONSTRAINT `donation_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `donation_campaign` (`id`) ON DELETE CASCADE,
  CONSTRAINT `donation_ibfk_2` FOREIGN KEY (`donor_id`) REFERENCES `user` (`id`),
  CONSTRAINT `donation_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donation`
--

LOCK TABLES `donation` WRITE;
/*!40000 ALTER TABLE `donation` DISABLE KEYS */;
/*!40000 ALTER TABLE `donation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `donation_campaign`
--

DROP TABLE IF EXISTS `donation_campaign`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `donation_campaign` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mosque_id` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text,
  `goal_cents` int DEFAULT NULL,
  `current_amount_cents` int DEFAULT '0',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('pending','approved','rejected','completed') DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `visible_public` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_campaign_status` (`status`),
  KEY `idx_campaign_mosque` (`mosque_id`),
  CONSTRAINT `donation_campaign_ibfk_1` FOREIGN KEY (`mosque_id`) REFERENCES `mosque` (`id`) ON DELETE CASCADE,
  CONSTRAINT `donation_campaign_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `donation_campaign`
--

LOCK TABLES `donation_campaign` WRITE;
/*!40000 ALTER TABLE `donation_campaign` DISABLE KEYS */;
/*!40000 ALTER TABLE `donation_campaign` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollment`
--

DROP TABLE IF EXISTS `enrollment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `course_id` int NOT NULL,
  `status` enum('active','completed','dropped') DEFAULT 'active',
  `enrollment_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `payment_id` int DEFAULT NULL COMMENT 'Reference to payment record (NULL for free courses)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_course` (`student_id`,`course_id`),
  KEY `idx_enrollment_student` (`student_id`),
  KEY `idx_enrollment_course` (`course_id`),
  KEY `fk_enrollment_payment` (`payment_id`),
  KEY `idx_enrollment_student_status` (`student_id`,`status`),
  KEY `idx_enrollment_course_status` (`course_id`,`status`),
  CONSTRAINT `enrollment_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `enrollment_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `course` (`id`) ON DELETE CASCADE,
  CONSTRAINT `enrollment_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollment`
--

LOCK TABLES `enrollment` WRITE;
/*!40000 ALTER TABLE `enrollment` DISABLE KEYS */;
/*!40000 ALTER TABLE `enrollment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event`
--

DROP TABLE IF EXISTS `event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mosque_id` int NOT NULL,
  `title` varchar(100) NOT NULL,
  `description` text,
  `event_date` date NOT NULL,
  `event_time` time DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `event_type` enum('religious','educational','social','fundraising') NOT NULL,
  `status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `campaign_id` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'approved',
  `rejection_reason` text,
  `fundraising_goal_cents` int DEFAULT NULL COMMENT 'Target amount to raise (in cents). Example: 500000 = $5,000',
  `current_donations_cents` int DEFAULT '0' COMMENT 'Total raised so far (in cents). Auto-updated by trigger',
  `min_donation_cents` int DEFAULT '1000' COMMENT 'Minimum donation amount (in cents). Default: 1000 = $10',
  `show_donors` tinyint(1) DEFAULT '1' COMMENT 'Show donor names publicly on event page',
  `allow_anonymous` tinyint(1) DEFAULT '1' COMMENT 'Allow donors to hide their name',
  PRIMARY KEY (`id`),
  KEY `mosque_id` (`mosque_id`),
  KEY `created_by` (`created_by`),
  KEY `campaign_id` (`campaign_id`),
  KEY `idx_event_date` (`event_date`),
  KEY `idx_event_status` (`status`),
  KEY `idx_event_fundraising` (`event_type`,`fundraising_goal_cents`),
  CONSTRAINT `event_ibfk_1` FOREIGN KEY (`mosque_id`) REFERENCES `mosque` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`),
  CONSTRAINT `event_ibfk_3` FOREIGN KEY (`campaign_id`) REFERENCES `donation_campaign` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event`
--

LOCK TABLES `event` WRITE;
/*!40000 ALTER TABLE `event` DISABLE KEYS */;
/*!40000 ALTER TABLE `event` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `validate_fundraising_event_before_insert` BEFORE INSERT ON `event` FOR EACH ROW BEGIN
    -- If event is NOT fundraising, clear all fundraising-related fields
    IF NEW.event_type != 'fundraising' THEN
        SET NEW.fundraising_goal_cents = NULL;
        SET NEW.current_donations_cents = 0;
        SET NEW.min_donation_cents = NULL;
        SET NEW.show_donors = NULL;
        SET NEW.allow_anonymous = NULL;
    ELSE
        -- If event IS fundraising, ensure required fields have defaults
        IF NEW.fundraising_goal_cents IS NULL THEN
            SET NEW.fundraising_goal_cents = 0;
        END IF;
        IF NEW.current_donations_cents IS NULL THEN
            SET NEW.current_donations_cents = 0;
        END IF;
        IF NEW.min_donation_cents IS NULL THEN
            SET NEW.min_donation_cents = 1000; -- Default $10 minimum
        END IF;
        IF NEW.show_donors IS NULL THEN
            SET NEW.show_donors = 1; -- Default show donors
        END IF;
        IF NEW.allow_anonymous IS NULL THEN
            SET NEW.allow_anonymous = 1; -- Default allow anonymous
        END IF;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `validate_fundraising_event_before_update` BEFORE UPDATE ON `event` FOR EACH ROW BEGIN
    -- If event type is changing TO non-fundraising, clear fundraising fields
    IF NEW.event_type != 'fundraising' THEN
        SET NEW.fundraising_goal_cents = NULL;
        SET NEW.current_donations_cents = 0;
        SET NEW.min_donation_cents = NULL;
        SET NEW.show_donors = NULL;
        SET NEW.allow_anonymous = NULL;
    ELSE
        -- If event IS fundraising, ensure required fields have defaults
        IF NEW.fundraising_goal_cents IS NULL THEN
            SET NEW.fundraising_goal_cents = OLD.fundraising_goal_cents;
        END IF;
        IF NEW.current_donations_cents IS NULL THEN
            SET NEW.current_donations_cents = OLD.current_donations_cents;
        END IF;
        IF NEW.min_donation_cents IS NULL THEN
            SET NEW.min_donation_cents = 1000;
        END IF;
        IF NEW.show_donors IS NULL THEN
            SET NEW.show_donors = 1;
        END IF;
        IF NEW.allow_anonymous IS NULL THEN
            SET NEW.allow_anonymous = 1;
        END IF;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `event_comment`
--

DROP TABLE IF EXISTS `event_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_comment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_event_comments` (`event_id`),
  KEY `idx_user_comments` (`user_id`),
  CONSTRAINT `event_comment_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_comment_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_comment`
--

LOCK TABLES `event_comment` WRITE;
/*!40000 ALTER TABLE `event_comment` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_donation`
--

DROP TABLE IF EXISTS `event_donation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_donation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL COMMENT 'Which fundraising event',
  `donor_id` int NOT NULL COMMENT 'Who donated',
  `payment_id` int NOT NULL COMMENT 'Payment transaction record',
  `stripe_payment_id` varchar(255) DEFAULT NULL COMMENT 'Stripe Payment Intent ID',
  `stripe_charge_id` varchar(255) DEFAULT NULL COMMENT 'Stripe Charge ID',
  `amount_cents` int DEFAULT NULL,
  `is_anonymous` tinyint(1) DEFAULT '0' COMMENT 'Hide donor name from public',
  `donor_message` text COMMENT 'Optional message from donor',
  `receipt_url` varchar(500) DEFAULT NULL COMMENT 'Link to receipt PDF (future)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_stripe_payment` (`stripe_payment_id`),
  KEY `payment_id` (`payment_id`),
  KEY `idx_event_donations` (`event_id`),
  KEY `idx_donor_donations` (`donor_id`),
  KEY `idx_donation_created` (`created_at`),
  KEY `idx_stripe_payment` (`stripe_payment_id`),
  KEY `idx_stripe_charge` (`stripe_charge_id`),
  CONSTRAINT `event_donation_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_donation_ibfk_2` FOREIGN KEY (`donor_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_donation_ibfk_3` FOREIGN KEY (`payment_id`) REFERENCES `payment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_donation`
--

LOCK TABLES `event_donation` WRITE;
/*!40000 ALTER TABLE `event_donation` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_donation` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `prevent_non_fundraising_donations_before_insert` BEFORE INSERT ON `event_donation` FOR EACH ROW BEGIN
    DECLARE v_event_type VARCHAR(50);
    DECLARE v_event_title VARCHAR(255);
    
    -- Get event type and title
    SELECT event_type, title INTO v_event_type, v_event_title
    FROM event 
    WHERE id = NEW.event_id;
    
    -- Prevent donation if event is not fundraising
    IF v_event_type IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Event not found';
    END IF;
    
    IF v_event_type != 'fundraising' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Donations are only allowed for fundraising events';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_event_donations_after_insert` AFTER INSERT ON `event_donation` FOR EACH ROW BEGIN
  UPDATE event 
  SET current_donations_cents = (
    SELECT COALESCE(SUM(amount_cents), 0)
    FROM event_donation 
    WHERE event_id = NEW.event_id
  )
  WHERE id = NEW.event_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `event_like`
--

DROP TABLE IF EXISTS `event_like`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_like` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_like` (`event_id`,`user_id`),
  KEY `idx_event_likes` (`event_id`),
  KEY `idx_user_likes` (`user_id`),
  CONSTRAINT `event_like_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_like_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_like`
--

LOCK TABLES `event_like` WRITE;
/*!40000 ALTER TABLE `event_like` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_like` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `event_rsvp`
--

DROP TABLE IF EXISTS `event_rsvp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_rsvp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('going','not_going','maybe') NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_event_rsvp` (`event_id`,`user_id`),
  KEY `idx_event_rsvp` (`event_id`,`status`),
  KEY `idx_user_rsvp` (`user_id`),
  CONSTRAINT `event_rsvp_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE,
  CONSTRAINT `event_rsvp_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `event_rsvp`
--

LOCK TABLES `event_rsvp` WRITE;
/*!40000 ALTER TABLE `event_rsvp` DISABLE KEYS */;
/*!40000 ALTER TABLE `event_rsvp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_download_log`
--

DROP TABLE IF EXISTS `material_download_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_download_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `material_id` int NOT NULL,
  `user_id` int NOT NULL,
  `downloaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_material_user` (`material_id`,`user_id`),
  CONSTRAINT `material_download_log_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `course_material` (`id`) ON DELETE CASCADE,
  CONSTRAINT `material_download_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_download_log`
--

LOCK TABLES `material_download_log` WRITE;
/*!40000 ALTER TABLE `material_download_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `material_download_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_section`
--

DROP TABLE IF EXISTS `material_section`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_section` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `section_name` varchar(255) NOT NULL,
  `section_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_course_sections` (`course_id`),
  CONSTRAINT `material_section_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_section`
--

LOCK TABLES `material_section` WRITE;
/*!40000 ALTER TABLE `material_section` DISABLE KEYS */;
/*!40000 ALTER TABLE `material_section` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `memorization_level`
--

DROP TABLE IF EXISTS `memorization_level`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `memorization_level` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_type_id` int NOT NULL,
  `level_number` int NOT NULL,
  `juz_range_start` int NOT NULL,
  `juz_range_end` int NOT NULL,
  `level_name` varchar(100) NOT NULL,
  `description` text,
  `page_range_start` int NOT NULL COMMENT 'Actual book page number start',
  `page_range_end` int NOT NULL COMMENT 'Actual book page number end',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_memorization_level` (`course_type_id`,`level_number`),
  KEY `idx_level_range` (`juz_range_start`,`juz_range_end`),
  CONSTRAINT `memorization_level_ibfk_1` FOREIGN KEY (`course_type_id`) REFERENCES `course_type` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `memorization_level`
--

LOCK TABLES `memorization_level` WRITE;
/*!40000 ALTER TABLE `memorization_level` DISABLE KEYS */;
INSERT INTO `memorization_level` VALUES (13,1,1,1,5,'Level 1 - Juz 1-5',NULL,1,101),(14,1,2,6,10,'Level 2 - Juz 6-10',NULL,102,201),(15,1,3,11,15,'Level 1 - Juz 11-15',NULL,202,301),(16,1,4,16,20,'Level 2 - Juz 16-20',NULL,302,401),(17,1,5,21,25,'Level 1 - Juz 21-25',NULL,402,501),(18,1,6,26,30,'Level 2 - Juz 26-30',NULL,502,604);
/*!40000 ALTER TABLE `memorization_level` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message`
--

DROP TABLE IF EXISTS `message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `message_text` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('text','image','file','system') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `file_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Image/file URL if attached',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL COMMENT 'File size in bytes',
  `reply_to_message_id` int DEFAULT NULL COMMENT 'For threaded replies',
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reply_to_message_id` (`reply_to_message_id`),
  KEY `idx_conversation` (`conversation_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_message_conversation_created` (`conversation_id`,`created_at` DESC),
  FULLTEXT KEY `idx_message_search` (`message_text`),
  CONSTRAINT `message_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_ibfk_3` FOREIGN KEY (`reply_to_message_id`) REFERENCES `message` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message`
--

LOCK TABLES `message` WRITE;
/*!40000 ALTER TABLE `message` DISABLE KEYS */;
/*!40000 ALTER TABLE `message` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `update_conversation_timestamp` AFTER INSERT ON `message` FOR EACH ROW BEGIN
  UPDATE conversation
  SET updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `message_read_status`
--

DROP TABLE IF EXISTS `message_read_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_read_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `read_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_read` (`message_id`,`user_id`),
  KEY `idx_message` (`message_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `message_read_status_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `message` (`id`) ON DELETE CASCADE,
  CONSTRAINT `message_read_status_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_read_status`
--

LOCK TABLES `message_read_status` WRITE;
/*!40000 ALTER TABLE `message_read_status` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_read_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mosque`
--

DROP TABLE IF EXISTS `mosque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mosque` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `mosque_admin_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_mosque_admin_id` (`mosque_admin_id`),
  KEY `idx_mosque_name` (`name`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `mosque_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `mosque_ibfk_3` FOREIGN KEY (`mosque_admin_id`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mosque`
--

LOCK TABLES `mosque` WRITE;
/*!40000 ALTER TABLE `mosque` DISABLE KEYS */;
INSERT INTO `mosque` VALUES (1,'Ebaad Al-Rahman ','+970 8 282 1234',NULL,1,'2025-11-25 23:05:11'),(2,'Al-Noor Mosque','059111100',NULL,1,'2025-12-05 14:15:31'),(3,'Al-Huda Mosque','059111101',NULL,1,'2025-12-05 14:15:31'),(4,'Al-Furqan Mosque','059111102',NULL,1,'2025-12-05 14:15:31'),(5,'Al-Taqwa Mosque','059111103',NULL,1,'2025-12-05 14:15:31'),(6,'Al-Salam Mosque','059111104',NULL,1,'2025-12-05 14:15:31'),(7,'Masjid Al-Ihsan','059111105',NULL,1,'2025-12-05 14:15:31'),(8,'Masjid Al-Rahman','059111106',NULL,1,'2025-12-05 14:15:31'),(9,'Masjid Al-Quds','059111107',NULL,1,'2025-12-05 14:15:31'),(10,'Masjid Al-Iman','059111108',NULL,1,'2025-12-05 14:15:31'),(11,'Masjid Al-Fatih','059111109',NULL,1,'2025-12-05 14:15:31');
/*!40000 ALTER TABLE `mosque` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mosque_location`
--

DROP TABLE IF EXISTS `mosque_location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mosque_location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mosque_id` int NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `address` text,
  `region` varchar(100) DEFAULT NULL,
  `governorate` enum('gaza','ramallah','hebron','nablus','jerusalem','bethlehem','jenin','tulkarm','qalqilya','salfit','jericho','tubas') DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `mosque_id` (`mosque_id`),
  CONSTRAINT `mosque_location_ibfk_1` FOREIGN KEY (`mosque_id`) REFERENCES `mosque` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mosque_location`
--

LOCK TABLES `mosque_location` WRITE;
/*!40000 ALTER TABLE `mosque_location` DISABLE KEYS */;
/*!40000 ALTER TABLE `mosque_location` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parent_child_relationship`
--

DROP TABLE IF EXISTS `parent_child_relationship`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parent_child_relationship` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL,
  `child_id` int NOT NULL,
  `relationship_type` enum('father','mother','guardian') NOT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `verification_code` varchar(10) DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_parent_child` (`parent_id`,`child_id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_parent_relationships` (`parent_id`),
  KEY `idx_child_relationships` (`child_id`),
  KEY `idx_verified_status` (`is_verified`),
  CONSTRAINT `parent_child_relationship_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `parent_child_relationship_ibfk_2` FOREIGN KEY (`child_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `parent_child_relationship_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parent_child_relationship`
--

LOCK TABLES `parent_child_relationship` WRITE;
/*!40000 ALTER TABLE `parent_child_relationship` DISABLE KEYS */;
/*!40000 ALTER TABLE `parent_child_relationship` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment`
--

DROP TABLE IF EXISTS `payment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount_cents` int NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `gateway` enum('stripe','paypal','local') NOT NULL,
  `gateway_charge_id` varchar(100) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `receipt_url` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `payment_type` enum('course','donation') NOT NULL DEFAULT 'course' COMMENT 'Type of payment: course enrollment or donation',
  `related_id` int DEFAULT NULL COMMENT 'course_id for course payments, campaign_id for donations',
  PRIMARY KEY (`id`),
  KEY `idx_payment_user` (`user_id`),
  KEY `idx_payment_status` (`status`),
  KEY `idx_payment_created` (`created_at`),
  KEY `idx_payment_type` (`payment_type`),
  KEY `idx_related_id` (`related_id`),
  KEY `idx_payment_user_type` (`user_id`,`payment_type`),
  CONSTRAINT `payment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment`
--

LOCK TABLES `payment` WRITE;
/*!40000 ALTER TABLE `payment` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `progress_milestone_history`
--

DROP TABLE IF EXISTS `progress_milestone_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `progress_milestone_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollment_id` int NOT NULL,
  `milestone_type` enum('exam_1','exam_2','exam_3','exam_4','exam_5','final_exam','graduation') NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `passed` tinyint(1) NOT NULL,
  `notes` text,
  `achieved_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `recorded_by` int NOT NULL,
  `notification_sent` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `idx_milestone_enrollment` (`enrollment_id`),
  KEY `idx_milestone_type` (`milestone_type`),
  CONSTRAINT `progress_milestone_history_ibfk_1` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment` (`id`) ON DELETE CASCADE,
  CONSTRAINT `progress_milestone_history_ibfk_2` FOREIGN KEY (`recorded_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `progress_milestone_history`
--

LOCK TABLES `progress_milestone_history` WRITE;
/*!40000 ALTER TABLE `progress_milestone_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `progress_milestone_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receipt_sequence`
--

DROP TABLE IF EXISTS `receipt_sequence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipt_sequence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `next_number` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_year` (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipt_sequence`
--

LOCK TABLES `receipt_sequence` WRITE;
/*!40000 ALTER TABLE `receipt_sequence` DISABLE KEYS */;
/*!40000 ALTER TABLE `receipt_sequence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` enum('ministry_admin','mosque_admin','teacher','student','parent','donor') NOT NULL,
  `description` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES (1,'ministry_admin','Administrator at the ministry level with full system access'),(2,'mosque_admin','Administrator for a specific mosque with management privileges'),(3,'teacher','Educator who teaches courses and manages student progress'),(4,'student','Learner who enrolls in courses and completes assignments'),(5,'parent','Parent or guardian of students, can monitor progress'),(6,'donor','Supporter who contributes donations to the platform');
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_assignment`
--

DROP TABLE IF EXISTS `role_assignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_assignment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `mosque_id` int DEFAULT NULL,
  `assigned_by` int DEFAULT NULL,
  `assigned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_role_mosque` (`user_id`,`role_id`,`mosque_id`),
  KEY `role_id` (`role_id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `idx_role_user` (`user_id`),
  KEY `idx_role_mosque` (`mosque_id`),
  KEY `idx_role_active` (`is_active`),
  CONSTRAINT `role_assignment_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_assignment_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`),
  CONSTRAINT `role_assignment_ibfk_3` FOREIGN KEY (`mosque_id`) REFERENCES `mosque` (`id`) ON DELETE SET NULL,
  CONSTRAINT `role_assignment_ibfk_4` FOREIGN KEY (`assigned_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_assignment`
--

LOCK TABLES `role_assignment` WRITE;
/*!40000 ALTER TABLE `role_assignment` DISABLE KEYS */;
INSERT INTO `role_assignment` VALUES (1,1,1,NULL,1,'2026-01-17 15:36:59',1);
/*!40000 ALTER TABLE `role_assignment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `student_progress`
--

DROP TABLE IF EXISTS `student_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enrollment_id` int NOT NULL,
  `completion_percentage` int DEFAULT '0',
  `teacher_notes` text,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `current_page` int DEFAULT '0' COMMENT 'Actual book page number (1-604 for complete Quran)',
  `exam_1_score` decimal(5,2) DEFAULT NULL COMMENT 'First 20 Pages exam',
  `exam_1_date` date DEFAULT NULL,
  `exam_1_notes` text,
  `exam_2_score` decimal(5,2) DEFAULT NULL COMMENT 'Second 20 Pages exam',
  `exam_2_date` date DEFAULT NULL,
  `exam_2_notes` text,
  `exam_3_score` decimal(5,2) DEFAULT NULL COMMENT 'Third 20 Pages exam',
  `exam_3_date` date DEFAULT NULL,
  `exam_3_notes` text,
  `exam_4_score` decimal(5,2) DEFAULT NULL COMMENT 'Fourth 20 Pages exam',
  `exam_4_date` date DEFAULT NULL,
  `exam_4_notes` text,
  `exam_5_score` decimal(5,2) DEFAULT NULL COMMENT 'Fifth 20 Pages exam',
  `exam_5_date` date DEFAULT NULL,
  `exam_5_notes` text,
  `final_exam_score` decimal(5,2) DEFAULT NULL COMMENT 'Final graduation exam',
  `final_exam_date` date DEFAULT NULL,
  `final_exam_notes` text,
  `is_graduated` tinyint(1) DEFAULT '0',
  `graduation_date` date DEFAULT NULL,
  `level_start_page` int DEFAULT NULL COMMENT 'Start page of current level',
  `level_end_page` int DEFAULT NULL COMMENT 'End page of current level',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_progress_per_enrollment` (`enrollment_id`),
  CONSTRAINT `student_progress_ibfk_1` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollment` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `student_progress`
--

LOCK TABLES `student_progress` WRITE;
/*!40000 ALTER TABLE `student_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_availability`
--

DROP TABLE IF EXISTS `teacher_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `day_of_week` enum('sunday','monday','tuesday','wednesday','thursday','friday','saturday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_teacher_availability` (`teacher_id`,`day_of_week`,`start_time`,`end_time`),
  KEY `idx_teacher_availability` (`teacher_id`,`day_of_week`),
  CONSTRAINT `teacher_availability_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_availability`
--

LOCK TABLES `teacher_availability` WRITE;
/*!40000 ALTER TABLE `teacher_availability` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher_availability` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_certification`
--

DROP TABLE IF EXISTS `teacher_certification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_certification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `has_tajweed_certificate` tinyint(1) DEFAULT '0',
  `has_sharea_certificate` tinyint(1) DEFAULT '0',
  `tajweed_certificate_url` varchar(500) DEFAULT NULL,
  `sharea_certificate_url` varchar(500) DEFAULT NULL,
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_teacher_user` (`user_id`),
  CONSTRAINT `teacher_certification_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_certification`
--

LOCK TABLES `teacher_certification` WRITE;
/*!40000 ALTER TABLE `teacher_certification` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher_certification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_expertise`
--

DROP TABLE IF EXISTS `teacher_expertise`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_expertise` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `course_type_id` int NOT NULL,
  `is_memorization_selected` tinyint(1) DEFAULT '0',
  `max_mem_level_id` int DEFAULT NULL,
  `years_experience` int DEFAULT '0',
  `hourly_rate_cents` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_teacher_expertise` (`teacher_id`,`course_type_id`),
  KEY `course_type_id` (`course_type_id`),
  KEY `max_mem_level_id` (`max_mem_level_id`),
  CONSTRAINT `teacher_expertise_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_expertise_ibfk_2` FOREIGN KEY (`course_type_id`) REFERENCES `course_type` (`id`),
  CONSTRAINT `teacher_expertise_ibfk_3` FOREIGN KEY (`max_mem_level_id`) REFERENCES `memorization_level` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_expertise`
--

LOCK TABLES `teacher_expertise` WRITE;
/*!40000 ALTER TABLE `teacher_expertise` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher_expertise` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `typing_indicator`
--

DROP TABLE IF EXISTS `typing_indicator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `typing_indicator` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `user_id` int NOT NULL,
  `started_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT ((now() + interval 5 second)),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_typing` (`conversation_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_conversation` (`conversation_id`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `typing_indicator_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `typing_indicator_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `typing_indicator`
--

LOCK TABLES `typing_indicator` WRITE;
/*!40000 ALTER TABLE `typing_indicator` DISABLE KEYS */;
/*!40000 ALTER TABLE `typing_indicator` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `gender` enum('male','female') NOT NULL,
  `dob` date NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_user_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'Hala Habash','hala2003habash@gmail.com','0123456789','$2b$10$vV5u.8ojGLgr0yapRdNxO.HAf45WVEPuQk3HQShR.2sdVV8fsXO.y','female','2003-06-17','2026-01-17 15:31:05','2026-01-17 15:31:05');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_location`
--

DROP TABLE IF EXISTS `user_location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `address_line1` varchar(255) DEFAULT NULL,
  `address_line2` varchar(255) DEFAULT NULL,
  `region` varchar(100) DEFAULT NULL,
  `governorate` enum('gaza','ramallah','hebron','nablus','jerusalem','bethlehem','jenin','tulkarm','qalqilya','salfit','jericho','tubas') DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_location_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_location`
--

LOCK TABLES `user_location` WRITE;
/*!40000 ALTER TABLE `user_location` DISABLE KEYS */;
INSERT INTO `user_location` VALUES (1,1,'Jerusalem Street',NULL,'Al-Dahiah','nablus','803',32.20675896,35.28358841,NULL,'2026-01-17 15:31:05','2026-01-17 15:31:05');
/*!40000 ALTER TABLE `user_location` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_active_enrollable_courses`
--

DROP TABLE IF EXISTS `v_active_enrollable_courses`;
/*!50001 DROP VIEW IF EXISTS `v_active_enrollable_courses`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_active_enrollable_courses` AS SELECT 
 1 AS `id`,
 1 AS `mosque_id`,
 1 AS `teacher_id`,
 1 AS `target_gender`,
 1 AS `course_type_id`,
 1 AS `name`,
 1 AS `description`,
 1 AS `course_format`,
 1 AS `price_cents`,
 1 AS `duration_weeks`,
 1 AS `total_sessions`,
 1 AS `max_students`,
 1 AS `schedule_type`,
 1 AS `target_age_group`,
 1 AS `is_active`,
 1 AS `course_level`,
 1 AS `created_by`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `enrollment_deadline`,
 1 AS `course_start_date`,
 1 AS `course_end_date`,
 1 AS `online_meeting_url`,
 1 AS `is_online_enabled`,
 1 AS `mosque_name`,
 1 AS `governorate`,
 1 AS `region`,
 1 AS `course_type_name`,
 1 AS `teacher_name`,
 1 AS `enrolled_count`,
 1 AS `available_spots`,
 1 AS `is_enrollment_open`,
 1 AS `days_until_deadline`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `verification_codes`
--

DROP TABLE IF EXISTS `verification_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_codes` (
  `user_id` int NOT NULL,
  `code` varchar(10) NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `verification_codes_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_codes`
--

LOCK TABLES `verification_codes` WRITE;
/*!40000 ALTER TABLE `verification_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `verification_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'manzilah'
--

--
-- Dumping routines for database 'manzilah'
--
/*!50003 DROP FUNCTION IF EXISTS `fn_check_enrollment_eligibility` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_check_enrollment_eligibility`(
    p_student_id INT,
    p_course_id INT
) RETURNS json
    DETERMINISTIC
BEGIN
    DECLARE v_student_dob DATE;
    DECLARE v_student_gender ENUM('male','female');
    DECLARE v_student_age INT;

    DECLARE v_is_active BOOLEAN;
    DECLARE v_enrollment_deadline DATE;
    DECLARE v_max_students INT;
    DECLARE v_target_gender ENUM('male','female');
    DECLARE v_target_age_group ENUM('children','teenagers','adults','all');
    DECLARE v_course_name VARCHAR(100);

    DECLARE v_enrolled_count INT;

    /* ================================
       1. Load student data
       ================================ */
    SELECT dob, gender
    INTO v_student_dob, v_student_gender
    FROM USER
    WHERE id = p_student_id;


    IF v_student_dob IS NULL THEN
        RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Student DOB is missing'));
    END IF;

    SET v_student_age = TIMESTAMPDIFF(YEAR, v_student_dob, CURDATE());

    /* ================================
       2. Load course data
       ================================ */
    SELECT
        is_active,
        enrollment_deadline,
        max_students,
        target_gender,
        target_age_group,
        name
    INTO
        v_is_active,
        v_enrollment_deadline,
        v_max_students,
        v_target_gender,
        v_target_age_group,
        v_course_name
    FROM COURSE
    WHERE id = p_course_id;

    IF v_is_active IS NULL OR v_is_active = FALSE THEN
        RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Course is not active'));
    END IF;

    /* ================================
       3. Check enrollment deadline
       ================================ */
    IF v_enrollment_deadline IS NOT NULL
       AND v_enrollment_deadline < CURDATE() THEN
        RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Enrollment deadline has passed'));
    END IF;

    /* ================================
       4. Check if already enrolled
       ================================ */
    IF EXISTS (
        SELECT 1
        FROM ENROLLMENT
        WHERE student_id = p_student_id
          AND course_id = p_course_id
          AND status = 'active'
    ) THEN
        RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Already enrolled in this course'));
    END IF;

    /* ================================
       5. Capacity check
       ================================ */
    IF v_max_students IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_enrolled_count
        FROM ENROLLMENT
        WHERE course_id = p_course_id
          AND status = 'active';

        IF v_enrolled_count >= v_max_students THEN
            RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Course is full'));
        END IF;
    END IF;

    /* ================================
       6. Gender eligibility
       ================================ */
    IF v_target_gender IS NOT NULL
       AND v_target_gender <> v_student_gender THEN
        RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY(CONCAT('This course is for ', v_target_gender, 's only')));
    END IF;

    /* ================================
       7. Age group eligibility
       ================================ */
    IF v_target_age_group <> 'all' THEN
        IF v_target_age_group = 'children' AND v_student_age >= 13 THEN
            RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Age check failed: Course is for children (under 13)'));
        END IF;

        IF v_target_age_group = 'teenagers'
           AND (v_student_age < 13 OR v_student_age > 18) THEN
            RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Age check failed: Course is for teenagers (13-18)'));
        END IF;

        IF v_target_age_group = 'adults' AND v_student_age < 18 THEN
            RETURN JSON_OBJECT('eligible', FALSE, 'reasons', JSON_ARRAY('Age check failed: Course is for adults (18+)'));
        END IF;
    END IF;

    /* ================================
       Eligible
       ================================ */
    RETURN JSON_OBJECT('eligible', TRUE, 'reasons', JSON_ARRAY());
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_unread_count` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `get_unread_count`(
  p_conversation_id INT,
  p_user_id INT
) RETURNS int
    READS SQL DATA
    DETERMINISTIC
BEGIN
  DECLARE v_last_read TIMESTAMP;
  DECLARE v_unread_count INT;
  
  -- Get when user last read messages
  SELECT last_read_at INTO v_last_read
  FROM conversation_participant
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
  
  -- Count messages after that time
  SELECT COUNT(*) INTO v_unread_count
  FROM message
  WHERE conversation_id = p_conversation_id
    AND created_at > COALESCE(v_last_read, '1970-01-01')
    AND sender_id != p_user_id
    AND is_deleted = FALSE;
  
  RETURN v_unread_count;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_enroll_student` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_enroll_student`(
    IN p_student_id INT,
    IN p_course_id INT,
    IN p_payment_id INT,  -- NULL for free courses
    OUT p_enrollment_id INT,
    OUT p_error_message VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_course_price INT;
    DECLARE v_mosque_id INT;
    DECLARE v_student_role_id INT;
    DECLARE v_already_assigned BOOLEAN;
    DECLARE v_eligibility JSON;
    
    -- NEW: Variables for progress initialization
    DECLARE v_course_type_id INT;
    DECLARE v_course_type_name VARCHAR(50);
    DECLARE v_course_level INT;
    DECLARE v_level_start_page INT;
    DECLARE v_level_end_page INT;

    -- Initialize outputs
    SET p_enrollment_id = NULL;
    SET p_error_message = NULL;

    -- Start transaction
    START TRANSACTION;

    -- 1. Eligibility check
    SET v_eligibility = fn_check_enrollment_eligibility(p_student_id, p_course_id);
    
    IF JSON_EXTRACT(v_eligibility, '$.eligible') = FALSE THEN
        SET p_error_message = JSON_UNQUOTE(JSON_EXTRACT(v_eligibility, '$.reasons[0]'));
        ROLLBACK;
        LEAVE proc_label;
    END IF;

    -- 2. Get course info (UPDATED: fetch course type and level)
    SELECT 
        c.price_cents, 
        c.mosque_id,
        c.course_type_id,
        c.course_level,
        ct.name
    INTO 
        v_course_price, 
        v_mosque_id,
        v_course_type_id,
        v_course_level,
        v_course_type_name
    FROM COURSE c
    JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
    WHERE c.id = p_course_id;

    -- 3. Payment validation for paid courses
    IF v_course_price > 0 THEN
        IF p_payment_id IS NULL THEN
            SET p_error_message = 'Payment required for this course';
            ROLLBACK;
            LEAVE proc_label;
        END IF;

        IF NOT EXISTS(SELECT 1 FROM PAYMENT
                      WHERE id = p_payment_id
                        AND user_id = p_student_id
                        AND status = 'completed') THEN
            SET p_error_message = 'Invalid or incomplete payment';
            ROLLBACK;
            LEAVE proc_label;
        END IF;
    END IF;

    -- 4. Create enrollment
    INSERT INTO ENROLLMENT (student_id, course_id, payment_id, status, enrollment_date)
    VALUES (p_student_id, p_course_id, p_payment_id, 'active', NOW());

    SET p_enrollment_id = LAST_INSERT_ID();

    -- 5. Create initial progress record (UPDATED: course-type aware)
    
    -- If memorization course, get level page ranges
    IF v_course_type_name = 'memorization' AND v_course_level IS NOT NULL THEN
        -- Get level page ranges
        SELECT page_range_start, page_range_end
        INTO v_level_start_page, v_level_end_page
        FROM MEMORIZATION_LEVEL
        WHERE id = v_course_level;
        
        -- Initialize with level bounds and page tracking
        INSERT INTO STUDENT_PROGRESS (
            enrollment_id, 
            completion_percentage,
            current_page,
            level_start_page,
            level_end_page
        ) VALUES (
            p_enrollment_id, 
            0,
            v_level_start_page,  -- Start at first page of level
            v_level_start_page,
            v_level_end_page
        );
    ELSE
        -- For non-memorization courses (Tajweed/Fiqh), simple initialization
        INSERT INTO STUDENT_PROGRESS (
            enrollment_id, 
            completion_percentage
        ) VALUES (
            p_enrollment_id, 
            0
        );
    END IF;

    -- 6. Assign student role to mosque (if not assigned)
    SELECT id INTO v_student_role_id FROM ROLE WHERE name = 'student';

    SELECT EXISTS(
        SELECT 1 FROM ROLE_ASSIGNMENT
        WHERE user_id = p_student_id
          AND role_id = v_student_role_id
          AND mosque_id = v_mosque_id
    ) INTO v_already_assigned;

    -- Create role assignment if not exists
    IF NOT v_already_assigned THEN
        INSERT INTO ROLE_ASSIGNMENT (user_id, role_id, mosque_id, is_active, assigned_at)
        VALUES (p_student_id, v_student_role_id, v_mosque_id, TRUE, NOW());
    END IF;

    COMMIT;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `truncate_all_except` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `truncate_all_except`()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE tbl VARCHAR(255);

  DECLARE cur CURSOR FOR
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'manzilah'
  AND table_type = 'BASE TABLE'
  AND table_name NOT IN (
    'mosque'
  );


  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  SET FOREIGN_KEY_CHECKS = 0;

  OPEN cur;

  read_loop: LOOP
    FETCH cur INTO tbl;
    IF done THEN
      LEAVE read_loop;
    END IF;

    SET @sql = CONCAT('TRUNCATE TABLE `', tbl, '`');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END LOOP;

  CLOSE cur;

  SET FOREIGN_KEY_CHECKS = 1;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Current Database: `manzilah`
--

USE `manzilah`;

--
-- Final view structure for view `conversation_with_latest_message`
--

/*!50001 DROP VIEW IF EXISTS `conversation_with_latest_message`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `conversation_with_latest_message` AS select `c`.`id` AS `id`,`c`.`type` AS `type`,`c`.`name` AS `name`,`c`.`description` AS `description`,`c`.`avatar_url` AS `avatar_url`,`c`.`created_by` AS `created_by`,`c`.`created_at` AS `created_at`,`c`.`updated_at` AS `updated_at`,`m`.`message_text` AS `last_message`,`m`.`created_at` AS `last_message_at`,`m`.`sender_id` AS `last_sender_id`,`u`.`full_name` AS `last_sender_name` from ((`conversation` `c` left join (select `message`.`conversation_id` AS `conversation_id`,`message`.`message_text` AS `message_text`,`message`.`created_at` AS `created_at`,`message`.`sender_id` AS `sender_id`,row_number() OVER (PARTITION BY `message`.`conversation_id` ORDER BY `message`.`created_at` desc )  AS `rn` from `message` where (`message`.`is_deleted` = false)) `m` on(((`c`.`id` = `m`.`conversation_id`) and (`m`.`rn` = 1)))) left join `user` `u` on((`m`.`sender_id` = `u`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_active_enrollable_courses`
--

/*!50001 DROP VIEW IF EXISTS `v_active_enrollable_courses`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_active_enrollable_courses` AS select `c`.`id` AS `id`,`c`.`mosque_id` AS `mosque_id`,`c`.`teacher_id` AS `teacher_id`,`c`.`target_gender` AS `target_gender`,`c`.`course_type_id` AS `course_type_id`,`c`.`name` AS `name`,`c`.`description` AS `description`,`c`.`course_format` AS `course_format`,`c`.`price_cents` AS `price_cents`,`c`.`duration_weeks` AS `duration_weeks`,`c`.`total_sessions` AS `total_sessions`,`c`.`max_students` AS `max_students`,`c`.`schedule_type` AS `schedule_type`,`c`.`target_age_group` AS `target_age_group`,`c`.`is_active` AS `is_active`,`c`.`course_level` AS `course_level`,`c`.`created_by` AS `created_by`,`c`.`created_at` AS `created_at`,`c`.`updated_at` AS `updated_at`,`c`.`enrollment_deadline` AS `enrollment_deadline`,`c`.`course_start_date` AS `course_start_date`,`c`.`course_end_date` AS `course_end_date`,`c`.`online_meeting_url` AS `online_meeting_url`,`c`.`is_online_enabled` AS `is_online_enabled`,`m`.`name` AS `mosque_name`,`ml`.`governorate` AS `governorate`,`ml`.`region` AS `region`,`ct`.`name` AS `course_type_name`,`u`.`full_name` AS `teacher_name`,(select count(0) from `enrollment` `e` where ((`e`.`course_id` = `c`.`id`) and (`e`.`status` = 'active'))) AS `enrolled_count`,(case when (`c`.`max_students` is null) then 999999 else (`c`.`max_students` - (select count(0) from `enrollment` `e` where ((`e`.`course_id` = `c`.`id`) and (`e`.`status` = 'active')))) end) AS `available_spots`,(case when (`c`.`enrollment_deadline` is null) then true when (`c`.`enrollment_deadline` >= curdate()) then true else false end) AS `is_enrollment_open`,(case when (`c`.`enrollment_deadline` is null) then NULL else (to_days(`c`.`enrollment_deadline`) - to_days(curdate())) end) AS `days_until_deadline` from ((((`course` `c` join `mosque` `m` on((`c`.`mosque_id` = `m`.`id`))) left join `mosque_location` `ml` on((`m`.`id` = `ml`.`mosque_id`))) join `course_type` `ct` on((`c`.`course_type_id` = `ct`.`id`))) left join `user` `u` on((`c`.`teacher_id` = `u`.`id`))) where ((`c`.`is_active` = true) and ((`c`.`enrollment_deadline` is null) or (`c`.`enrollment_deadline` >= curdate()))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-17 16:34:00
