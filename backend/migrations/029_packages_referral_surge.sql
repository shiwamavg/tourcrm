-- Migration 029: Predefined Packages Seat Limit, Surge Pricing & Referral Commission
USE tour_crm;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Modify commissions table to make agent_id nullable and add referrer_booking_id
ALTER TABLE commissions MODIFY COLUMN agent_id INT UNSIGNED NULL;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'commissions' AND column_name = 'referrer_booking_id') = 0,
    'ALTER TABLE commissions ADD COLUMN referrer_booking_id INT UNSIGNED NULL AFTER agent_id, ADD CONSTRAINT fk_commissions_referrer_booking FOREIGN KEY (referrer_booking_id) REFERENCES bookings(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add referrer_booking_id to leads, quotations, bookings
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'referrer_booking_id') = 0,
    'ALTER TABLE leads ADD COLUMN referrer_booking_id INT UNSIGNED NULL AFTER package_id, ADD CONSTRAINT fk_leads_referrer_booking FOREIGN KEY (referrer_booking_id) REFERENCES bookings(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotations' AND column_name = 'referrer_booking_id') = 0,
    'ALTER TABLE quotations ADD COLUMN referrer_booking_id INT UNSIGNED NULL AFTER package_id, ADD CONSTRAINT fk_quotations_referrer_booking FOREIGN KEY (referrer_booking_id) REFERENCES bookings(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'referrer_booking_id') = 0,
    'ALTER TABLE bookings ADD COLUMN referrer_booking_id INT UNSIGNED NULL AFTER package_id, ADD CONSTRAINT fk_bookings_referrer_booking FOREIGN KEY (referrer_booking_id) REFERENCES bookings(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add columns to packages for limits, pricing rules and referrals
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'max_participants') = 0,
    'ALTER TABLE packages ADD COLUMN max_participants INT UNSIGNED NULL AFTER price',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'referral_commission_type') = 0,
    'ALTER TABLE packages ADD COLUMN referral_commission_type ENUM(\'percentage\', \'fixed\') NOT NULL DEFAULT \'percentage\' AFTER max_participants',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'referral_commission_rate') = 0,
    'ALTER TABLE packages ADD COLUMN referral_commission_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER referral_commission_type',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'price_surge_type') = 0,
    'ALTER TABLE packages ADD COLUMN price_surge_type ENUM(\'none\', \'percentage\', \'fixed\') NOT NULL DEFAULT \'none\' AFTER referral_commission_rate',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'price_surge_threshold') = 0,
    'ALTER TABLE packages ADD COLUMN price_surge_threshold INT UNSIGNED NULL AFTER price_surge_type',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'price_surge_amount') = 0,
    'ALTER TABLE packages ADD COLUMN price_surge_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER price_surge_threshold',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
