-- =============================================================
-- Migration 028: Agents & Commissions Workflow
-- =============================================================

USE tour_crm;

-- ── 1. Create Agents Table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL DEFAULT 1,
    agency_name     VARCHAR(200) NOT NULL,
    agent_name      VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    commission_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    commission_rate DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    status          ENUM('pending', 'approved', 'rejected', 'inactive') NOT NULL DEFAULT 'pending',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_agent_email_company (email, company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── 2. Add columns to leads, quotations, bookings ────────────

-- Add agent_id to leads
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'agent_id') = 0,
    'ALTER TABLE leads ADD COLUMN agent_id INT UNSIGNED NULL AFTER created_by, ADD FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add columns to quotations
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotations' AND column_name = 'agent_id') = 0,
    'ALTER TABLE quotations ADD COLUMN agent_id INT UNSIGNED NULL AFTER created_by, ADD FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotations' AND column_name = 'agent_commission') = 0,
    'ALTER TABLE quotations ADD COLUMN agent_commission DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER grand_total',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add columns to bookings
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'agent_id') = 0,
    'ALTER TABLE bookings ADD COLUMN agent_id INT UNSIGNED NULL AFTER created_by, ADD FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'agent_commission') = 0,
    'ALTER TABLE bookings ADD COLUMN agent_commission DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER total_amount',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ── 3. Create Commissions Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL DEFAULT 1,
    agent_id            INT UNSIGNED NOT NULL,
    booking_id          INT UNSIGNED NOT NULL,
    amount              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status              ENUM('pending', 'approved', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_reference   VARCHAR(100) NULL,
    paid_at             DATETIME NULL,
    notes               TEXT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_commission_agent (agent_id),
    INDEX idx_commission_booking (booking_id),
    INDEX idx_commission_status (status)
) ENGINE=InnoDB;
