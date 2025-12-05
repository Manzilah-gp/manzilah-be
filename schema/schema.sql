-- ======================================
-- 1. CORE TABLES
-- ======================================

CREATE DATABASE IF NOT EXISTS manzilah;
USE manzilah;

-- USER TABLE (no direct mosque link)
-- APPROVED
CREATE TABLE USER (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    dob DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
);



-- ROLE TABLE
-- APPROVED
CREATE TABLE ROLE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('ministry_admin', 'mosque_admin', 'teacher', 'student', 'parent', 'donor') NOT NULL,
    description TEXT,
    UNIQUE INDEX unique_role_name (name)
);

-- Insert default roles
-- APPROVED
INSERT INTO ROLE (name, description) VALUES
('ministry_admin', 'Administrator at the ministry level with full system access'),
('mosque_admin', 'Administrator for a specific mosque with management privileges'),
('teacher', 'Educator who teaches courses and manages student progress'),
('student', 'Learner who enrolls in courses and completes assignments'),
('parent', 'Parent or guardian of students, can monitor progress'),
('donor', 'Supporter who contributes donations to the platform');

-- MOSQUE TABLE
CREATE TABLE MOSQUE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20),
    mosque_admin_id INT NULL UNIQUE,
	created_by INT NULL ,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES USER(id) ON DELETE SET NULL,
    FOREIGN KEY (mosque_admin_id) REFERENCES USER(id) ON DELETE SET NULL,
    INDEX idx_mosque_name (name)
);


-- Enhanced ROLE_ASSIGNMENT TABLE with mosque context
-- why is active? elso approved
CREATE TABLE ROLE_ASSIGNMENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    mosque_id INT NULL, -- NULL for ministry_admin
    assigned_by INT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES ROLE(id),
    FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by) REFERENCES USER(id),
    UNIQUE KEY unique_user_role_mosque (user_id, role_id, mosque_id),
    INDEX idx_role_user (user_id),
    INDEX idx_role_mosque (mosque_id),
    INDEX idx_role_active (is_active)
);


-- ======================================
-- 2. LOCATION MANAGEMENT
-- ======================================

CREATE TABLE MOSQUE_LOCATION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mosque_id INT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    region VARCHAR(100),
	governorate ENUM('gaza', 'ramallah', 'hebron', 'nablus', 'jerusalem', 'bethlehem', 'jenin', 'tulkarm', 'qalqilya', 'salfit', 'jericho', 'tubas'),
    postal_code VARCHAR(20),
    FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id) ON DELETE CASCADE
    );
    
CREATE TABLE USER_LOCATION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    region VARCHAR(100),
    governorate ENUM('gaza', 'ramallah', 'hebron', 'nablus', 'jerusalem', 'bethlehem', 'jenin', 'tulkarm', 'qalqilya', 'salfit', 'jericho', 'tubas'),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_by INT,
	updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE
);

-- ======================================
-- 3. TEACHER/SUPERVISOR MANAGEMENT
-- ======================================
-- APPROVED THIS SECTION


CREATE TABLE TEACHER_CERTIFICATION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    has_tajweed_certificate BOOLEAN DEFAULT FALSE,
    has_sharea_certificate BOOLEAN DEFAULT FALSE,
    tajweed_certificate_url VARCHAR(500),
    sharea_certificate_url VARCHAR(500),
    additional_qualifications JSON,
    experience_years INT DEFAULT 0,
    previous_mosques JSON,
    preferred_teaching_format ENUM('online', 'onsite', 'hybrid') DEFAULT 'onsite',
   student_age_preference JSON,
   hourly_rate_cents INT DEFAULT 0,
    auto_approval_score INT DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    review_notes TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES USER(id),
    INDEX idx_teacher_status (status),
    INDEX idx_teacher_user (user_id),
    INDEX idx_auto_score (auto_approval_score)
);

CREATE TABLE COURSE_TYPE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('memorization', 'tajweed', 'feqh') NOT NULL,
    description TEXT,
    UNIQUE INDEX unique_course_type (name)
);

INSERT INTO COURSE_TYPE (name, description) VALUES
('memorization', 'Quran Memorization Courses'),
('tajweed', 'Tajweed and Recitation Rules'),
('feqh', 'Islamic Jurisprudence Studies');

CREATE TABLE MEMORIZATION_LEVEL (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_type_id INT NOT NULL,
    level_number INT NOT NULL,
    juz_range_start INT NOT NULL,
    juz_range_end INT NOT NULL,
    level_name VARCHAR(100) NOT NULL,
    description TEXT,
    FOREIGN KEY (course_type_id) REFERENCES COURSE_TYPE(id) ON DELETE CASCADE,
    UNIQUE KEY unique_memorization_level (course_type_id, level_number),
    INDEX idx_level_range (juz_range_start, juz_range_end)
);

-- Insert memorization levels (6 levels covering 30 Juz)
INSERT INTO MEMORIZATION_LEVEL (course_type_id, level_number, juz_range_start, juz_range_end, level_name) VALUES
(1, 1, 1, 5, 'Level 1 - Juz 1-5'),
(1, 2, 6, 10, 'Level 2 - Juz 6-10'),
(1, 3, 11, 15, 'Level 1 - Juz 11-15'),
(1, 4, 16, 20, 'Level 2 - Juz 16-20'),
(1, 5, 21, 25, 'Level 1 - Juz 21-25'),
(1, 6, 26, 30, 'Level 2 - Juz 26-30');

CREATE TABLE TEACHER_EXPERTISE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    course_type_id INT NOT NULL,
    is_memorization_selected BOOLEAN DEFAULT FALSE,
	max_mem_level_id INT NULL,
    years_experience INT DEFAULT 0,
    hourly_rate_cents INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (course_type_id) REFERENCES COURSE_TYPE(id),
    FOREIGN KEY (max_mem_level_id) REFERENCES MEMORIZATION_LEVEL(id),
    UNIQUE KEY unique_teacher_expertise (teacher_id, course_type_id)
);

CREATE TABLE TEACHER_AVAILABILITY (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    day_of_week ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (teacher_id) REFERENCES USER(id) ON DELETE CASCADE,
    UNIQUE KEY unique_teacher_availability (teacher_id, day_of_week, start_time, end_time),
    INDEX idx_teacher_availability (teacher_id, day_of_week)
);

CREATE TABLE TEACHER_PREFERRED_MOSQUE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    mosque_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id) ON DELETE CASCADE,
    UNIQUE KEY unique_teacher_mosque (teacher_id, mosque_id)
);


-- ======================================
-- 4. COURSE MANAGEMENT
-- ======================================

CREATE TABLE COURSE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mosque_id INT NOT NULL,
    target_gender ENUM('male', 'female') NULL,
    course_type_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    course_format ENUM('short', 'long') NOT NULL,
    difficulty_level INT NOT NULL, -- References memorization level or custom level
    price_cents INT NOT NULL DEFAULT 0,
    duration_weeks INT,
    total_sessions INT,
    max_students INT,
    schedule_type ENUM('online', 'onsite', 'hybrid') DEFAULT 'onsite',
    target_age_group JSON,
    is_active BOOLEAN DEFAULT TRUE,
    course_level INT NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id) ON DELETE CASCADE,
    FOREIGN KEY (course_type_id) REFERENCES COURSE_TYPE(id),
    FOREIGN KEY (created_by) REFERENCES USER(id),
    FOREIGN KEY (course_level) REFERENCES MEMORIZATION_LEVEL(id),
    INDEX idx_course_mosque (mosque_id),
    INDEX idx_course_active (is_active),
    INDEX idx_course_type (course_type_id),
    INDEX idx_target_gender (target_gender)
);

CREATE TABLE COURSE_SCHEDULE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    day_of_week ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(255),
    FOREIGN KEY (course_id) REFERENCES COURSE(id) ON DELETE CASCADE,
    INDEX idx_course_schedule (course_id)
);

-- ======================================
-- 5. ENROLLMENT & PROGRESS TRACKING
-- ======================================

CREATE TABLE ENROLLMENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    teacher_id INT NOT NULL,
    current_level INT DEFAULT 1,
    enrollment_date DATE NOT NULL,
    completion_date DATE NULL,
    status ENUM('active', 'completed', 'dropped', 'suspended') DEFAULT 'active',
    total_paid_cents INT DEFAULT 0,
    auto_assigned BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES COURSE(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES USER(id),
    UNIQUE KEY unique_student_course (student_id, course_id),
    INDEX idx_enrollment_teacher (teacher_id),
    INDEX idx_enrollment_status (status),
    INDEX idx_enrollment_date (enrollment_date)
);

CREATE TABLE ATTENDANCE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    session_date DATE NOT NULL,
    status ENUM('present', 'absent', 'excused') NOT NULL,
    notes TEXT,
    recorded_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES ENROLLMENT(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES USER(id),
    UNIQUE KEY unique_attendance (enrollment_id, session_date),
    INDEX idx_session_date (session_date)
);

CREATE TABLE STUDENT_PROGRESS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    enrollment_id INT NOT NULL,
    level_id INT NOT NULL,
    completion_percentage INT DEFAULT 0,
    last_activity_date DATE,
    is_level_completed BOOLEAN DEFAULT FALSE,
    level_completion_date DATE,
    teacher_notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES ENROLLMENT(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id) REFERENCES MEMORIZATION_LEVEL(id),
    UNIQUE KEY unique_progress (enrollment_id, level_id),
    INDEX idx_completion (is_level_completed)
);

-- ======================================
-- 6. PARENT-CHILD RELATIONSHIPS
-- ======================================

CREATE TABLE PARENT_CHILD_RELATIONSHIP (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parent_id INT NOT NULL,
    child_id INT NOT NULL,
    relationship_type ENUM('father', 'mother', 'guardian') NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(10),
    verified_by INT NULL,
    verified_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES USER(id),
    UNIQUE KEY unique_parent_child (parent_id, child_id),
    INDEX idx_parent_relationships (parent_id),
    INDEX idx_child_relationships (child_id),
    INDEX idx_verified_status (is_verified)
);

-- ======================================
-- 7. PAYMENT & DONATION SYSTEM
-- ======================================

CREATE TABLE PAYMENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount_cents INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    gateway ENUM('stripe','paypal','local') NOT NULL,
    gateway_charge_id VARCHAR(100),
    status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
    receipt_url VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(id),
    INDEX idx_payment_user (user_id),
    INDEX idx_payment_status (status),
    INDEX idx_payment_created (created_at)
);

CREATE TABLE DONATION_CAMPAIGN (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mosque_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    goal_cents INT,
    current_amount_cents INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    approved_by INT NULL,
    approved_at DATETIME NULL,
    visible_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES USER(id),
    INDEX idx_campaign_status (status),
    INDEX idx_campaign_mosque (mosque_id)
);

CREATE TABLE DONATION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    donor_id INT NOT NULL,
    amount_cents INT NOT NULL,
    payment_id INT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES DONATION_CAMPAIGN(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES USER(id),
    FOREIGN KEY (payment_id) REFERENCES PAYMENT(id),
    INDEX idx_donation_campaign (campaign_id),
    INDEX idx_donation_donor (donor_id)
);

-- ======================================
-- 8. EVENTS & COMMUNICATION
-- ======================================

CREATE TABLE EVENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mosque_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    location VARCHAR(255),
    event_type ENUM('religious', 'educational', 'social', 'fundraising') NOT NULL,
    status ENUM('scheduled', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
	campaign_id INT NULL, 
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES USER(id),
	FOREIGN KEY (campaign_id) REFERENCES DONATION_CAMPAIGN(id) ON DELETE SET NULL,
    INDEX idx_event_date (event_date),
    INDEX idx_event_status (status)
);

CREATE TABLE EVALUATION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evaluator_id INT NOT NULL,
    evaluatee_id INT NOT NULL,
    enrollment_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (evaluator_id) REFERENCES USER(id),
    FOREIGN KEY (evaluatee_id) REFERENCES USER(id),
    FOREIGN KEY (enrollment_id) REFERENCES ENROLLMENT(id) ON DELETE CASCADE,
    UNIQUE KEY unique_evaluation (evaluator_id, evaluatee_id, enrollment_id),
    INDEX idx_evaluatee_rating (evaluatee_id, rating)
);

-- ======================================
-- 9. AI INSIGHTS
-- ======================================


CREATE TABLE AI_INSIGHTS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    insight_type ENUM('study_plan', 'progress_prediction', 'resource_recommendation', 'teacher_matching') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    confidence_score DECIMAL(3, 2),
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_applied BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE,
    INDEX idx_insight_user (user_id),
    INDEX idx_insight_type (insight_type)
);