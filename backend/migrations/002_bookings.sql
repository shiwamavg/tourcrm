-- =============================================================
-- Migration 002: Add minimal bookings table
-- (Quotation module only — keeps the booking minimal, just for sample data)
-- =============================================================

USE tour_crm;

CREATE TABLE IF NOT EXISTS bookings (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    booking_number      VARCHAR(50) NOT NULL UNIQUE,
    quotation_id        INT UNSIGNED NOT NULL,
    customer_name       VARCHAR(200) NOT NULL,
    customer_phone      VARCHAR(20) NOT NULL,
    customer_email      VARCHAR(200),
    destination_text    VARCHAR(200) NOT NULL,
    trip_start_date     DATE NOT NULL,
    trip_end_date       DATE NOT NULL,
    adults              INT NOT NULL DEFAULT 1,
    children_below_5    INT NOT NULL DEFAULT 0,
    children_above_5    INT NOT NULL DEFAULT 0,
    total_amount        DECIMAL(12,2) NOT NULL,
    booking_fee_pct     DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    booking_fee_amount  DECIMAL(12,2) NOT NULL,
    amount_paid         DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance_due         DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    status              ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
    payment_status      ENUM('pending','partial','paid','refunded') NOT NULL DEFAULT 'pending',
    special_requests    TEXT,
    internal_notes      TEXT,
    created_by          INT UNSIGNED NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES staff_users(id),
    INDEX idx_bookings_quote (quotation_id),
    INDEX idx_bookings_status (status)
) ENGINE=InnoDB;
