-- =============================================================
-- Migration 011: SaaS Multi-Tenant Architecture
-- Adds company_id to all tables, creates companies, packages,
-- subscriptions, super admin, and payment/invoice tables
-- =============================================================

USE tour_crm;

-- ── 1. Companies Table (Tenants) ─────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    slug                VARCHAR(100) UNIQUE,
    email               VARCHAR(200),
    phone               VARCHAR(20),
    address             TEXT,
    gstin               VARCHAR(20),
    logo_url            VARCHAR(500),
    website             VARCHAR(200),
    status              ENUM('active','suspended','inactive','pending') NOT NULL DEFAULT 'pending',
    subscription_status ENUM('active','expired','trial','cancelled') NOT NULL DEFAULT 'trial',
    trial_ends_at       DATETIME,
    max_users           INT UNSIGNED NOT NULL DEFAULT 5,
    max_leads           INT UNSIGNED NOT NULL DEFAULT 1000,
    max_quotations      INT UNSIGNED NOT NULL DEFAULT 500,
    max_bookings        INT UNSIGNED NOT NULL DEFAULT 200,
    features            JSON,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_companies_status (status),
    INDEX idx_companies_sub_status (subscription_status)
) ENGINE=InnoDB;

-- ── 2. Subscription Packages ─────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_packages (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    price_monthly   DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_yearly    DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_users       INT UNSIGNED NOT NULL DEFAULT 5,
    max_leads       INT UNSIGNED NOT NULL DEFAULT 1000,
    max_quotations  INT UNSIGNED NOT NULL DEFAULT 500,
    max_bookings    INT UNSIGNED NOT NULL DEFAULT 200,
    features        JSON,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 3. Company Subscriptions History ─────────────────────────
CREATE TABLE IF NOT EXISTS company_subscriptions (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    package_id      INT UNSIGNED NOT NULL,
    billing_cycle   ENUM('monthly','yearly','trial') NOT NULL DEFAULT 'trial',
    amount          DECIMAL(10,2) NOT NULL,
    gst_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL,
    status          ENUM('active','expired','cancelled','pending') NOT NULL DEFAULT 'pending',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE RESTRICT,
    INDEX idx_cs_company (company_id),
    INDEX idx_cs_dates (start_date, end_date)
) ENGINE=InnoDB;

-- ── 4. Super Admins ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS super_admins (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at   DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── 5. Company Payments (Super Admin Collections) ────────────
CREATE TABLE IF NOT EXISTS company_payments (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    subscription_id     INT UNSIGNED,
    amount              DECIMAL(10,2) NOT NULL,
    gst_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(10,2) NOT NULL,
    gateway             ENUM('cashfree','razorpay','bank_transfer','upi','cash') NOT NULL DEFAULT 'bank_transfer',
    gateway_order_id    VARCHAR(100),
    gateway_payment_id  VARCHAR(100),
    status              ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    paid_at             DATETIME,
    transaction_id      VARCHAR(100),
    notes               TEXT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES company_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_cp_company (company_id),
    INDEX idx_cp_status (status)
) ENGINE=InnoDB;

-- ── 6. Company Invoices (Super Admin Billing) ───────────────
CREATE TABLE IF NOT EXISTS company_invoices (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    subscription_id     INT UNSIGNED,
    invoice_number      VARCHAR(50) NOT NULL UNIQUE,
    billing_period_start DATE,
    billing_period_end   DATE,
    amount              DECIMAL(10,2) NOT NULL,
    gst_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(10,2) NOT NULL,
    status              ENUM('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
    due_date            DATE,
    paid_at             DATETIME,
    pdf_path            VARCHAR(500),
    notes               TEXT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES company_subscriptions(id) ON DELETE SET NULL,
    INDEX idx_ci_company (company_id),
    INDEX idx_ci_status (status)
) ENGINE=InnoDB;

-- ── 7. Add company_id to ALL existing tables ─────────────────

-- staff_users
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'staff_users' AND column_name = 'company_id') = 0,
    'ALTER TABLE staff_users ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- destinations
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'destinations' AND column_name = 'company_id') = 0,
    'ALTER TABLE destinations ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- hotel_rates
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'hotel_rates' AND column_name = 'company_id') = 0,
    'ALTER TABLE hotel_rates ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- car_types
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'car_types' AND column_name = 'company_id') = 0,
    'ALTER TABLE car_types ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- car_rates
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'car_rates' AND column_name = 'company_id') = 0,
    'ALTER TABLE car_rates ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- agency_settings
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'agency_settings' AND column_name = 'company_id') = 0,
    'ALTER TABLE agency_settings ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- leads
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'company_id') = 0,
    'ALTER TABLE leads ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotations
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotations' AND column_name = 'company_id') = 0,
    'ALTER TABLE quotations ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotation_hotels
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_hotels' AND column_name = 'company_id') = 0,
    'ALTER TABLE quotation_hotels ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotation_cars
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_cars' AND column_name = 'company_id') = 0,
    'ALTER TABLE quotation_cars ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotation_flights
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_flights' AND column_name = 'company_id') = 0,
    'ALTER TABLE quotation_flights ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotation_misc
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_misc' AND column_name = 'company_id') = 0,
    'ALTER TABLE quotation_misc ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotation_versions
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotation_versions' AND column_name = 'company_id') = 0,
    'ALTER TABLE quotation_versions ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- bookings
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'company_id') = 0,
    'ALTER TABLE bookings ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- payments
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'payments' AND column_name = 'company_id') = 0,
    'ALTER TABLE payments ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- invoices
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'invoices' AND column_name = 'company_id') = 0,
    'ALTER TABLE invoices ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- reviews
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'reviews' AND column_name = 'company_id') = 0,
    'ALTER TABLE reviews ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- audit_log
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'audit_log' AND column_name = 'company_id') = 0,
    'ALTER TABLE audit_log ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1 AFTER id, ADD FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- roles (global, no company_id needed, but keep for reference)
-- car_types are per-company now

-- ── 8. Seed default company for existing data ────────────────
INSERT INTO companies (id, name, slug, email, phone, address, status, subscription_status, max_users, max_leads, max_quotations, max_bookings, features)
VALUES (1, 'Sikkim Trails Travel', 'sikkim-trails', 'bookings@sikkimtrails.in', '+91 98765 43210',
        'M.G. Marg, Gangtok, Sikkim 737101', 'active', 'active', 10, 5000, 2000, 500,
        JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard'))
ON DUPLICATE KEY UPDATE id=id;

-- ── 9. Seed default subscription packages ────────────────────
INSERT INTO subscription_packages (name, slug, description, price_monthly, price_yearly, max_users, max_leads, max_quotations, max_bookings, features, sort_order)
VALUES
('Starter', 'starter', 'Perfect for small travel agencies just getting started.', 2999, 29990, 3, 500, 200, 50,
 JSON_ARRAY('leads','quotations','bookings','dashboard','destinations','rates'), 1),

('Professional', 'professional', 'For growing agencies with team and regular bookings.', 5999, 59990, 10, 3000, 1000, 300,
 JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard'), 2),

('Enterprise', 'enterprise', 'Full-featured solution for large agencies and DMCs.', 11999, 119990, 50, 20000, 5000, 2000,
 JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard','whatsapp','supplier','b2b','website'), 3)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ── 10. Seed super admin ─────────────────────────────────────
-- Password: SuperAdmin@123 (hashed with bcrypt)
INSERT INTO super_admins (full_name, email, password_hash, is_active)
VALUES ('Super Admin', 'superadmin@tourcrm.local',
        '$2b$10$demohashnotreal...........................................', 1)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- ── 11. Update agency_settings to link to company_id 1 ─────
UPDATE agency_settings SET company_id = 1 WHERE company_id = 0 OR company_id IS NULL;

-- ── Verification ───────────────────────────────────────────
SELECT 'companies' AS tbl, COUNT(*) AS rows_count FROM companies
UNION ALL SELECT 'subscription_packages', COUNT(*) FROM subscription_packages
UNION ALL SELECT 'super_admins', COUNT(*) FROM super_admins;
