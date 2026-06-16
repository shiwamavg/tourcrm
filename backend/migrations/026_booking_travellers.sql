-- Migration 026: Booking Travellers
-- Add table to capture individual traveller details per booking (names, aadhar)

USE tour_crm;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS booking_travellers (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    booking_id      INT UNSIGNED NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    age             INT UNSIGNED NULL,
    aadhar_number   VARCHAR(20) NULL,
    traveller_type  ENUM('adult','child_below_5','child_above_5') NOT NULL DEFAULT 'adult',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_bt_company (company_id, booking_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
