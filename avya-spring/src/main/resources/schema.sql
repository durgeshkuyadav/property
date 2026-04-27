-- ============================================================
-- AVYA HOME PRIVATE LIMITED — CRM DATABASE SCHEMA
-- Phase 1: Authentication & User Management
-- Run this file in MySQL to create all tables
-- ============================================================

CREATE DATABASE IF NOT EXISTS avya_home_crm1
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE avya_home_crm1;

-- ─── ASSOCIATES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS associates (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  associate_code   VARCHAR(20) NOT NULL UNIQUE,      -- AH10001
  name             VARCHAR(100) NOT NULL,
  mobile           VARCHAR(15) NOT NULL UNIQUE,
  email            VARCHAR(100) UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  
  -- Network
  sponsor_id       INT NULL,                          -- who referred this person
  FOREIGN KEY (sponsor_id) REFERENCES associates(id) ON DELETE SET NULL,
  commission_pct   DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  role             ENUM('super_admin','manager','associate','sub_associate') NOT NULL DEFAULT 'associate',
  
  -- Personal Info
  father_name      VARCHAR(100),
  date_of_birth    DATE,
  anniversary_date DATE,
  gender           ENUM('Male','Female','Other'),
  marital_status   VARCHAR(30),
  current_occupation VARCHAR(100),
  work_company     VARCHAR(150),
  pan_number       VARCHAR(20),
  aadhar_number    VARCHAR(20),
  address          TEXT,
  profile_photo    VARCHAR(255),
  
  -- Nominee
  nominee_name     VARCHAR(100),
  nominee_relation VARCHAR(50),
  nominee_age      INT,
  nominee_mobile   VARCHAR(15),
  nominee_gender   ENUM('Male','Female','Other'),
  
  -- Bank Details
  bank_account_no  VARCHAR(30),
  bank_ifsc        VARCHAR(20),
  bank_name        VARCHAR(100),
  bank_branch      VARCHAR(100),
  
  -- Status
  status           ENUM('active','inactive','suspended') NOT NULL DEFAULT 'active',
  email_verified   BOOLEAN DEFAULT FALSE,
  mobile_verified  BOOLEAN DEFAULT FALSE,
  joining_date     DATE NOT NULL DEFAULT (CURDATE()),
  
  -- Timestamps
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_sponsor (sponsor_id),
  INDEX idx_mobile (mobile),
  INDEX idx_associate_code (associate_code),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── OTP TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otps (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  mobile       VARCHAR(15) NOT NULL,
  email        VARCHAR(100),
  otp_code     VARCHAR(6) NOT NULL,
  purpose      ENUM('login','forgot_password','verify_mobile','verify_email') NOT NULL,
  is_used      BOOLEAN DEFAULT FALSE,
  expires_at   TIMESTAMP NOT NULL,
  attempts     INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_mobile_purpose (mobile, purpose),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

-- ─── REFRESH TOKENS TABLE ────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  associate_id  INT NOT NULL,
  token_hash    VARCHAR(255) NOT NULL UNIQUE,
  expires_at    TIMESTAMP NOT NULL,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  is_revoked    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (associate_id) REFERENCES associates(id) ON DELETE CASCADE,
  INDEX idx_associate (associate_id),
  INDEX idx_token (token_hash)
) ENGINE=InnoDB;

-- ─── AUDIT LOGS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  associate_id  INT,
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50),
  entity_id     INT,
  old_values    JSON,
  new_values    JSON,
  ip_address    VARCHAR(45),
  user_agent    TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (associate_id) REFERENCES associates(id) ON DELETE SET NULL,
  INDEX idx_associate (associate_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ─── PROJECTS TABLE (needed for Phase 2, created now) ────────
CREATE TABLE IF NOT EXISTS projects (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  project_name   VARCHAR(150) NOT NULL UNIQUE,
  location       VARCHAR(200),
  total_area     DECIMAL(12,2),
  total_plots    INT DEFAULT 0,
  base_price_sqft DECIMAL(10,2),
  launch_date    DATE,
  description    TEXT,
  status         ENUM('active','completed','archived') DEFAULT 'active',
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES associates(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── PLOTS TABLE (needed for Phase 2) ────────────────────────
CREATE TABLE IF NOT EXISTS plots (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  project_id       INT NOT NULL,
  plot_number      VARCHAR(20) NOT NULL,
  block_code       VARCHAR(30),
  dimension_sqft   DECIMAL(10,4) NOT NULL,
  plot_category    VARCHAR(100),
  plot_facing      VARCHAR(50),
  bsp_per_sqft     DECIMAL(10,2) NOT NULL,
  total_price      DECIMAL(12,2) GENERATED ALWAYS AS (dimension_sqft * bsp_per_sqft) STORED,
  plc_charges      DECIMAL(10,2) DEFAULT 0,
  status           ENUM('available','hold','booked','sold_out') DEFAULT 'available',
  status_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY unique_plot (project_id, plot_number),
  INDEX idx_status (status),
  INDEX idx_project (project_id)
) ENGINE=InnoDB;

-- ─── CUSTOMERS TABLE (Phase 3) ───────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  mobile          VARCHAR(15) NOT NULL,
  email           VARCHAR(100),
  aadhar_number   VARCHAR(20),
  pan_number      VARCHAR(20),
  address         TEXT,
  plot_id         INT,
  promoter_id     INT,
  booking_date    DATE NOT NULL,
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  amount_paid     DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due     DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status          ENUM('active','sold_out','cancelled') DEFAULT 'active',
  created_by      INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE SET NULL,
  FOREIGN KEY (promoter_id) REFERENCES associates(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES associates(id) ON DELETE SET NULL,
  INDEX idx_promoter (promoter_id),
  INDEX idx_plot (plot_id)
) ENGINE=InnoDB;

-- ─── CUSTOMER PAYMENTS TABLE (Phase 3) ───────────────────────
CREATE TABLE IF NOT EXISTS customer_payments (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  customer_id     INT NOT NULL,
  payment_type    ENUM('book_amount','custom_installment') DEFAULT 'custom_installment',
  payment_mode    ENUM('rtgs_neft','cheque','cash','online') NOT NULL,
  ref_chq_number  VARCHAR(100),
  ref_chq_date    DATE,
  ref_chq_bank    VARCHAR(100),
  amount          DECIMAL(12,2) NOT NULL,
  deposit_date    DATE,
  due_date        DATE,
  status          ENUM('received','pending','bounced','cancelled') DEFAULT 'received',
  remarks         TEXT,
  created_by      INT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES associates(id) ON DELETE SET NULL,
  INDEX idx_customer (customer_id),
  INDEX idx_deposit_date (deposit_date)
) ENGINE=InnoDB;

-- ─── PAYOUTS TABLE (Phase 4) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  payout_code       VARCHAR(20) NOT NULL UNIQUE,
  associate_id      INT NOT NULL,
  from_date         DATE NOT NULL,
  to_date           DATE NOT NULL,
  self_income       DECIMAL(12,2) DEFAULT 0,
  level_income      DECIMAL(12,2) DEFAULT 0,
  leadership_income DECIMAL(12,2) DEFAULT 0,
  royalty_income    DECIMAL(12,2) DEFAULT 0,
  advance_bonus     DECIMAL(12,2) DEFAULT 0,
  monthly_bonus     DECIMAL(12,2) DEFAULT 0,
  total_income      DECIMAL(12,2) DEFAULT 0,
  admin_charge      DECIMAL(12,2) DEFAULT 0,
  tds_percentage    DECIMAL(5,2) DEFAULT 5.00,
  tds_amount        DECIMAL(12,2) DEFAULT 0,
  net_payable       DECIMAL(12,2) DEFAULT 0,
  status            ENUM('pending','approved','paid','cancelled') DEFAULT 'pending',
  approved_by       INT,
  approved_at       TIMESTAMP,
  created_by        INT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (associate_id) REFERENCES associates(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES associates(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES associates(id) ON DELETE SET NULL,
  INDEX idx_associate (associate_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- ─── PAYOUT PAYMENTS TABLE (Phase 4) ─────────────────────────
CREATE TABLE IF NOT EXISTS payout_payments (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  payout_id      INT NOT NULL,
  associate_id   INT NOT NULL,
  mode_of_pay    ENUM('rtgs','neft','imps','cheque') NOT NULL DEFAULT 'neft',
  ref_number     VARCHAR(100),
  ref_info       VARCHAR(100),
  ref_date       DATE,
  tds_status     BOOLEAN DEFAULT TRUE,
  gross_amount   DECIMAL(12,2) NOT NULL,
  tds_deducted   DECIMAL(12,2) DEFAULT 0,
  net_paid       DECIMAL(12,2) NOT NULL,
  remark         VARCHAR(200),
  created_by     INT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE,
  FOREIGN KEY (associate_id) REFERENCES associates(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES associates(id) ON DELETE SET NULL,
  INDEX idx_payout (payout_id),
  INDEX idx_associate (associate_id)
) ENGINE=InnoDB;

-- ─── SEED: DEFAULT SUPER ADMIN ───────────────────────────────
-- Password: Admin@123 (bcrypt hashed — change immediately after first login)
INSERT IGNORE INTO associates (
  associate_code, name, mobile, email, password_hash, role,
  commission_pct, status, joining_date
) VALUES (
  'AH00001',
  'Avya Home Admin',
  '9999999999',
  'admin@avyahome.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBpj6YQdP5HXQK',
  'super_admin',
  0.00,
  'active',
  CURDATE()
);

-- ─── SEED: SAMPLE PROJECTS ───────────────────────────────────
INSERT IGNORE INTO projects (project_name, location, total_plots, base_price_sqft, status, created_by)
SELECT 'Victory Paradise', 'Jaunpur, Uttar Pradesh', 200, 499.00, 'active', id
FROM associates WHERE associate_code = 'AH00001' LIMIT 1;

INSERT IGNORE INTO projects (project_name, location, total_plots, base_price_sqft, status, created_by)
SELECT 'Prakriti Vihar', 'Jaunpur, Uttar Pradesh', 150, 1160.00, 'active', id
FROM associates WHERE associate_code = 'AH00001' LIMIT 1;

INSERT IGNORE INTO projects (project_name, location, total_plots, base_price_sqft, status, created_by)
SELECT 'Prakriti Vihar II', 'Jaunpur, Uttar Pradesh', 100, 1000.00, 'active', id
FROM associates WHERE associate_code = 'AH00001' LIMIT 1;

SELECT '✅ Database schema created successfully!' AS result;
SELECT '👤 Default admin: mobile=9999999999, password=Admin@123' AS info;
