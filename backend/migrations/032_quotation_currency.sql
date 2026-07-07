-- =============================================================
-- Migration 032: Multi-Currency Support for Quotations
-- =============================================================

USE tour_crm;

-- 1. Add currency fields to quotations
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotations' AND column_name = 'billing_currency') = 0,
    'ALTER TABLE quotations ADD COLUMN billing_currency VARCHAR(10) NOT NULL DEFAULT "INR" AFTER grand_total',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotations' AND column_name = 'exchange_rate') = 0,
    'ALTER TABLE quotations ADD COLUMN exchange_rate DECIMAL(12,6) NOT NULL DEFAULT 1.000000 AFTER billing_currency',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add currency fields to quotation_hotels
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_hotels' AND column_name = 'currency_code') = 0,
    'ALTER TABLE quotation_hotels ADD COLUMN currency_code VARCHAR(10) NOT NULL DEFAULT "INR" AFTER special_charges_note',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_hotels' AND column_name = 'exchange_rate') = 0,
    'ALTER TABLE quotation_hotels ADD COLUMN exchange_rate DECIMAL(12,6) NOT NULL DEFAULT 1.000000 AFTER currency_code',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_hotels' AND column_name = 'original_rate') = 0,
    'ALTER TABLE quotation_hotels ADD COLUMN original_rate DECIMAL(12,2) NULL AFTER exchange_rate',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add currency fields to quotation_cars
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_cars' AND column_name = 'currency_code') = 0,
    'ALTER TABLE quotation_cars ADD COLUMN currency_code VARCHAR(10) NOT NULL DEFAULT "INR" AFTER sort_order',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_cars' AND column_name = 'exchange_rate') = 0,
    'ALTER TABLE quotation_cars ADD COLUMN exchange_rate DECIMAL(12,6) NOT NULL DEFAULT 1.000000 AFTER currency_code',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_cars' AND column_name = 'original_rate') = 0,
    'ALTER TABLE quotation_cars ADD COLUMN original_rate DECIMAL(12,2) NULL AFTER exchange_rate',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
