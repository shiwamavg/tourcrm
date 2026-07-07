-- =============================================================
-- Migration 030: Enterprise Features Foundation
-- Vendors, Vendor Costing Ledger, Bookings profitability.
-- =============================================================

USE tour_crm;

-- 1. Create Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL DEFAULT 1,
    name            VARCHAR(200) NOT NULL,
    contact_name    VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    destination_id  INT UNSIGNED NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL,
    INDEX idx_vendor_company (company_id)
) ENGINE=InnoDB;

-- 2. Create Vendor Ledgers (Cost tracking per booking)
CREATE TABLE IF NOT EXISTS vendor_ledgers (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL DEFAULT 1,
    booking_id      INT UNSIGNED NOT NULL,
    vendor_id       INT UNSIGNED NOT NULL,
    cost_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status          ENUM('pending', 'partial', 'paid') NOT NULL DEFAULT 'pending',
    notes           TEXT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    INDEX idx_vl_booking (booking_id),
    INDEX idx_vl_vendor (vendor_id)
) ENGINE=InnoDB;

-- 3. Add vendor_cost and net_profit to bookings
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'vendor_cost') = 0,
    'ALTER TABLE bookings ADD COLUMN vendor_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER agent_commission',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'net_profit') = 0,
    'ALTER TABLE bookings ADD COLUMN net_profit DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER vendor_cost',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
