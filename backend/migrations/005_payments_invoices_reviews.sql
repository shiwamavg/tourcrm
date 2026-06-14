-- 005_payments_invoices_reviews.sql
-- Adds the four tables that power the new Customer Payments (Cashfree),
-- Invoice Generation, Rating & Reviews, and Customer Portal (OTP login)
-- modules. Designed to be MySQL 8 / InnoDB compatible.
--
-- The schema intentionally keeps `quotation_id` nullable on payments
-- and invoices so we can also attach them to a direct (no-quote) booking
-- in the future, but for now every booking comes from a quotation.

USE tour_crm;

-- ─────────────────────────────────────────────────────────────
-- 1. payments
--    One row per payment attempt. status flows:
--      created   – order created at Cashfree, waiting for customer
--      paid      – confirmed (webhook or manual mark)
--      failed    – customer cancelled / gateway rejected
--      refunded  – admin marked refund
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id            INT UNSIGNED NOT NULL,
    quotation_id          INT UNSIGNED NULL,

    -- gateway identifiers
    gateway               ENUM('cashfree','cash','bank_transfer','upi','card','other') NOT NULL DEFAULT 'cashfree',
    gateway_order_id      VARCHAR(80) NULL,           -- our idempotency token; same value sent to Cashfree
    gateway_payment_id    VARCHAR(120) NULL,           -- Cashfree cf_payment_id (returned after payment)
    gateway_signature     VARCHAR(256) NULL,           -- raw signature for audit

    -- amounts
    amount                DECIMAL(12,2) NOT NULL,
    currency              CHAR(3) NOT NULL DEFAULT 'INR',

    -- lifecycle
    status                ENUM('created','paid','failed','refunded') NOT NULL DEFAULT 'created',
    method_label          VARCHAR(40) NULL,            -- e.g. "UPI", "Visa ****1234"
    paid_at               DATETIME NULL,
    failed_at             DATETIME NULL,
    refunded_at           DATETIME NULL,

    -- who recorded / collected it (staff member for offline, NULL for gateway)
    collected_by          INT UNSIGNED NULL,          -- staff_users.id (NULL for online)
    offline_reference     VARCHAR(120) NULL,           -- cheque #, UPI ref, txn note
    offline_note          VARCHAR(500) NULL,

    -- raw gateway payload for audit
    raw_response          JSON NULL,

    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_payments_gateway_order (gateway, gateway_order_id),
    KEY idx_payments_booking (booking_id),
    KEY idx_payments_status  (status),
    CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_payments_quotation
        FOREIGN KEY (quotation_id) REFERENCES quotations(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_payments_collected_by
        FOREIGN KEY (collected_by) REFERENCES staff_users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. invoices
--    One invoice per payment received (or one consolidated invoice
--    per booking once the booking is fully paid). Generated server-side
--    as a PDF, stored on disk and served via a download endpoint.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    invoice_number        VARCHAR(40) NOT NULL,        -- e.g. INV-2026-0001
    booking_id            INT UNSIGNED NOT NULL,
    quotation_id          INT UNSIGNED NULL,

    -- amounts (snapshot of the booking totals at the time of invoicing)
    subtotal              DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount            DECIMAL(12,2) NOT NULL DEFAULT 0,
    total                 DECIMAL(12,2) NOT NULL,

    -- file on disk (relative to backend /uploads/invoices)
    pdf_path              VARCHAR(255) NULL,
    pdf_generated_at      DATETIME NULL,

    issued_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    issued_by             INT UNSIGNED NULL,
    notes                 VARCHAR(500) NULL,

    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_invoices_number (invoice_number),
    KEY idx_invoices_booking (booking_id),
    CONSTRAINT fk_invoices_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_invoices_quotation
        FOREIGN KEY (quotation_id) REFERENCES quotations(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_invoices_issued_by
        FOREIGN KEY (issued_by) REFERENCES staff_users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. reviews
--    A customer can leave ONE review per booking. 1..5 stars plus
--    a free-text comment. Reviews are public-by-default but admin
--    can hide them by flipping `is_visible`.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    booking_id            INT UNSIGNED NOT NULL,
    customer_name         VARCHAR(200) NOT NULL,        -- snapshot in case customer record changes
    customer_email        VARCHAR(200) NULL,

    rating                TINYINT UNSIGNED NOT NULL,    -- 1..5
    title                 VARCHAR(120) NULL,
    comment               TEXT NOT NULL,

    is_verified           TINYINT(1) NOT NULL DEFAULT 1, -- linked to a real booking
    is_visible            TINYINT(1) NOT NULL DEFAULT 1, -- admin moderation
    admin_reply           TEXT NULL,
    admin_reply_at        DATETIME NULL,
    admin_reply_by        INT UNSIGNED NULL,

    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_reviews_booking (booking_id),         -- one review per booking
    KEY idx_reviews_rating  (rating),
    KEY idx_reviews_visible (is_visible, created_at),
    CONSTRAINT fk_reviews_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. customer_otps
--    OTP-based login for the customer portal. Customers enter
--    their email -> we email (or log in dev) a 6-digit code valid
--    for 10 minutes. The portal session is a separate JWT.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_otps (
    id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    email                 VARCHAR(200) NOT NULL,
    code_hash             CHAR(64) NOT NULL,            -- sha256 hex of the OTP
    attempts              TINYINT UNSIGNED NOT NULL DEFAULT 0,
    consumed              TINYINT(1) NOT NULL DEFAULT 0,
    expires_at            DATETIME NOT NULL,
    consumed_at           DATETIME NULL,
    ip_address            VARCHAR(45) NULL,
    user_agent            VARCHAR(255) NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_otps_email_active (email, consumed, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. Indexes on bookings to make the new lookups fast
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX idx_bookings_status          ON bookings(status);
