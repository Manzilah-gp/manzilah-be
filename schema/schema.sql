-- Create schema
CREATE DATABASE IF NOT EXISTS manzilah;
USE manzilah;

-- ======================================
-- 1. USER TABLE (no FK to MOSQUE yet)
-- ======================================
CREATE TABLE USER (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    dob DATE NOT NULL,
    is_child BOOLEAN,
    parent_id INT NULL,
    mosque_id INT NULL, -- will link later
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved BOOLEAN DEFAULT FALSE
);

-- ======================================
-- 2. ROLE TABLE
-- ======================================
CREATE TABLE ROLE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('ministry_admin', 'mosque_admin', 'teacher', 'student', 'parent', 'donor') NOT NULL,
    description TEXT
);

INSERT INTO ROLE (name, description) VALUES
('ministry_admin', 'Administrator at the ministry level with full system access'),
('mosque_admin', 'Administrator for a specific mosque with management privileges'),
('teacher', 'Educator who teaches courses and manages student progress'),
('student', 'Learner who enrolls in courses and completes assignments'),
('parent', 'Parent or guardian of students, can monitor progress'),
('donor', 'Supporter who contributes donations to the platform');

-- ======================================
-- 3. ROLE_ASSIGNMENT TABLE
-- ======================================
CREATE TABLE ROLE_ASSIGNMENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- 4. MOSQUE TABLE (no FK to USER yet)
-- ======================================
CREATE TABLE MOSQUE (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    coordinates VARCHAR(100),
    contact_number VARCHAR(20),
    mosque_admin_id INT NULL, -- will link later
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- 5. PAYMENT TABLE
-- ======================================
CREATE TABLE PAYMENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount_cents INT NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    gateway ENUM('stripe','local') NOT NULL,
    gateway_charge_id VARCHAR(100),
    status ENUM('pending','completed','failed') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- 6. DONATION_CAMPAIGN TABLE
-- ======================================
CREATE TABLE DONATION_CAMPAIGN (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mosque_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    goal_cents INT,
    approved_by INT NULL,
    approved_at DATETIME NULL,
    visible_public BOOLEAN DEFAULT TRUE
);

-- ======================================
-- 7. DONATION TABLE
-- ======================================
CREATE TABLE DONATION (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    donor_id INT NOT NULL,
    amount_cents INT NOT NULL,
    payment_id INT NOT NULL,
    receipt_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ======================================
-- 8. EVENT TABLE
-- ======================================
CREATE TABLE EVENT (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mosque_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    starts_at DATETIME,
    ends_at DATETIME,
    approved BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL
);

-- ======================================
-- 9. NOW ADD FOREIGN KEYS
-- ======================================

-- USER relations
ALTER TABLE USER
    ADD CONSTRAINT fk_user_parent
        FOREIGN KEY (parent_id) REFERENCES USER(id),
    ADD CONSTRAINT fk_user_mosque
        FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id);

-- MOSQUE relation
ALTER TABLE MOSQUE
    ADD CONSTRAINT fk_mosque_admin
        FOREIGN KEY (mosque_admin_id) REFERENCES USER(id);

-- ROLE_ASSIGNMENT relations
ALTER TABLE ROLE_ASSIGNMENT
    ADD CONSTRAINT fk_role_user
        FOREIGN KEY (user_id) REFERENCES USER(id),
    ADD CONSTRAINT fk_role_role
        FOREIGN KEY (role_id) REFERENCES ROLE(id),
    ADD CONSTRAINT fk_role_assigned_by
        FOREIGN KEY (assigned_by) REFERENCES USER(id);

-- PAYMENT relation
ALTER TABLE PAYMENT
    ADD CONSTRAINT fk_payment_user
        FOREIGN KEY (user_id) REFERENCES USER(id);

-- DONATION_CAMPAIGN relations
ALTER TABLE DONATION_CAMPAIGN
    ADD CONSTRAINT fk_campaign_mosque
        FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id),
    ADD CONSTRAINT fk_campaign_approved
        FOREIGN KEY (approved_by) REFERENCES USER(id);

-- DONATION relations
ALTER TABLE DONATION
    ADD CONSTRAINT fk_donation_campaign
        FOREIGN KEY (campaign_id) REFERENCES DONATION_CAMPAIGN(id),
    ADD CONSTRAINT fk_donation_donor
        FOREIGN KEY (donor_id) REFERENCES USER(id),
    ADD CONSTRAINT fk_donation_payment
        FOREIGN KEY (payment_id) REFERENCES PAYMENT(id);

-- EVENT relations
ALTER TABLE EVENT
    ADD CONSTRAINT fk_event_mosque
        FOREIGN KEY (mosque_id) REFERENCES MOSQUE(id),
    ADD CONSTRAINT fk_event_creator
        FOREIGN KEY (created_by) REFERENCES USER(id);
