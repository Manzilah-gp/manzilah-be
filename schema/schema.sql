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
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE,
    INDEX idx_teacher_user (user_id),
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


-- ======================================
-- 4. COURSE MANAGEMENT
-- ======================================

CREATE TABLE COURSE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mosque_id INT NOT NULL,
    teacher_id INT NULL AFTER mosque_id,
    target_gender ENUM('male', 'female') NULL,
    course_type_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    course_format ENUM('short', 'long') NOT NULL,
    price_cents INT NOT NULL DEFAULT 0,
    duration_weeks INT,
    total_sessions INT,
    max_students INT,
    schedule_type ENUM('online', 'onsite', 'hybrid') DEFAULT 'onsite',
    target_age_group ENUM('children', 'teenagers', 'adults', 'all') DEFAULT 'all' ,
    is_active BOOLEAN DEFAULT TRUE,
    course_level INT NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    enrollment_deadline DATE NULL COMMENT 'Last date students can enroll',
    course_start_date DATE NULL COMMENT 'When course begins',
    course_end_date DATE NULL COMMENT 'When course ends',
    online_meeting_url VARCHAR(500) NULL COMMENT 'Jitsi/Daily room URL',
    is_online_enabled BOOLEAN DEFAULT FALSE COMMENT 'If true, course has online sessions',
    FOREIGN KEY (teacher_id) REFERENCES USER(id) ON DELETE SET NULL,
    FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id) ON DELETE CASCADE,
    FOREIGN KEY (course_type_id) REFERENCES COURSE_TYPE(id),
    FOREIGN KEY (created_by) REFERENCES USER(id),
    FOREIGN KEY (course_level) REFERENCES MEMORIZATION_LEVEL(id),
    FOREIGN KEY (teacher_id) REFERENCES USER(id)ON DELETE CASCADE,
    INDEX idx_course_mosque (mosque_id),
    INDEX idx_course_active (is_active),
    INDEX idx_course_type (course_type_id),
    INDEX idx_target_gender (target_gender),
    INDEX idx_enrollment_deadline (enrollment_deadline),
    INDEX idx_course_dates (course_start_date, course_end_date) 
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

    status ENUM('active', 'completed', 'dropped') DEFAULT 'active',
    enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,

    FOREIGN KEY (student_id) REFERENCES USER(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES COURSE(id) ON DELETE CASCADE,

    UNIQUE KEY unique_student_course (student_id, course_id),
    INDEX idx_enrollment_student (student_id),
    INDEX idx_enrollment_course (course_id)
);

-- deleted
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

    completion_percentage INT DEFAULT 0,
    teacher_notes TEXT,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (enrollment_id) REFERENCES ENROLLMENT(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress_per_enrollment (enrollment_id)
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
    payment_type ENUM('course', 'donation') NOT NULL DEFAULT 'course' COMMENT 'Type of payment: course enrollment or donation',
    related_id INT NULL COMMENT 'course_id for course payments, campaign_id for donations',
    FOREIGN KEY (user_id) REFERENCES USER(id),
    INDEX idx_payment_user (user_id),
    INDEX idx_payment_status (status),
    INDEX idx_payment_created (created_at),
    INDEX idx_payment_type (payment_type),
    INDEX idx_related_id (related_id)
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

-- ==================
-- PAYMENT & ENROLLMENT updates
-- ==================


ALTER TABLE ENROLLMENT 
ADD COLUMN payment_id INT NULL COMMENT 'Reference to payment record (NULL for free courses)',
ADD FOREIGN KEY fk_enrollment_payment (payment_id) REFERENCES PAYMENT(id) ON DELETE SET NULL;


-- --  Enrollment queries
CREATE INDEX idx_enrollment_student_status ON ENROLLMENT(student_id, status);
CREATE INDEX idx_enrollment_course_status ON ENROLLMENT(course_id, status);

-- -- Payment queries
CREATE INDEX idx_payment_user_type ON PAYMENT(user_id, payment_type);

-- -- Course queries for public browsing
CREATE INDEX idx_course_active_deadline ON COURSE(is_active, enrollment_deadline);
CREATE INDEX idx_course_mosque_active ON COURSE(mosque_id, is_active);


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

--deleted
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

-- ============================================
-- 10. Create View for Active Courses
-- Makes it easy to query enrollable courses
-- ============================================
CREATE OR REPLACE VIEW v_active_enrollable_courses AS
SELECT 
    c.*,
    m.name as mosque_name,
    ml.governorate,
    ml.region,
    ct.name as course_type_name,
    u.full_name as teacher_name,
    -- Calculate enrolled students
    (SELECT COUNT(*) FROM ENROLLMENT e 
     WHERE e.course_id = c.id AND e.status = 'active') as enrolled_count,
    -- Calculate available spots
    CASE 
        WHEN c.max_students IS NULL THEN 999999
        ELSE c.max_students - (SELECT COUNT(*) FROM ENROLLMENT e 
                               WHERE e.course_id = c.id AND e.status = 'active')
    END as available_spots,
    -- Check if enrollment is still open
    CASE 
        WHEN c.enrollment_deadline IS NULL THEN TRUE
        WHEN c.enrollment_deadline >= CURDATE() THEN TRUE
        ELSE FALSE
    END as is_enrollment_open,
    -- Days until enrollment deadline
    CASE 
        WHEN c.enrollment_deadline IS NULL THEN NULL
        ELSE DATEDIFF(c.enrollment_deadline, CURDATE())
    END as days_until_deadline
FROM COURSE c
JOIN MOSQUE m ON c.mosque_id = m.id
LEFT JOIN MOSQUE_LOCATION ml ON m.id = ml.mosque_id
JOIN COURSE_TYPE ct ON c.course_type_id = ct.id
LEFT JOIN USER u ON c.teacher_id = u.id
WHERE c.is_active = TRUE
  AND (c.enrollment_deadline IS NULL OR c.enrollment_deadline >= CURDATE());


-- ============================================
-- 11. Create Function to Check Enrollment Eligibility
-- Returns detailed eligibility information
--  INCLUDES: Age and Gender validation
-- ============================================
DELIMITER //

CREATE FUNCTION fn_check_enrollment_eligibility (
    p_student_id INT,
    p_course_id INT
)
RETURNS JSON
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
END//

DELIMITER ;

-- ============================================
-- 12. Create Stored Procedure for Enrollment
-- Handles the complete enrollment process
-- ============================================


DELIMITER //

CREATE PROCEDURE sp_enroll_student(
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
    DECLARE v_is_online_enabled BOOLEAN;
    DECLARE v_online_url VARCHAR(500);
    DECLARE v_eligibility JSON;

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

    -- 2. Get course info
    SELECT price_cents, mosque_id 
    INTO v_course_price, v_mosque_id
    FROM COURSE
    WHERE id = p_course_id;


    -- 4. Payment validation for paid courses
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

    -- 5. Create enrollment
    INSERT INTO ENROLLMENT (student_id, course_id, payment_id, status, enrollment_date)
    VALUES (p_student_id, p_course_id, p_payment_id, 'active', NOW());

    SET p_enrollment_id = LAST_INSERT_ID();

    -- 6. Create initial progress record
    INSERT INTO STUDENT_PROGRESS (enrollment_id, completion_percentage)
    VALUES (p_enrollment_id, 0);

    -- 7. Assign student role to mosque (if not assigned)
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
END//

DELIMITER ;


-- ============================================
-- Handling events posts page
-- ============================================
-- 1. Likes 
CREATE TABLE EVENT_LIKE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES EVENT(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_like (event_id, user_id)
);

-- 2. RSVPs
CREATE TABLE EVENT_RSVP (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('going', 'not_going', 'maybe') NOT NULL,
    FOREIGN KEY (event_id) REFERENCES EVENT(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_rsvp (event_id, user_id)
);

-- 3. Comments
CREATE TABLE EVENT_COMMENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES EVENT(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE CASCADE
);

-- 4. Add approval field to EVENT table 
ALTER TABLE EVENT 
ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved';

ALTER TABLE EVENT 
ADD COLUMN rejection_reason TEXT NULL 
AFTER approval_status;