-- =============================================================
-- Tour & Travel Agency CRM — MySQL Schema
-- Quotation Module (Phase 1)
-- MySQL 8.0+ recommended (uses CHECK, JSON, generated columns)
-- =============================================================

CREATE DATABASE IF NOT EXISTS tour_crm
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tour_crm;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- STAFF / CRM USERS
-- =============================================================
CREATE TABLE IF NOT EXISTS staff_users (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin','manager','telecaller','accounts') NOT NULL DEFAULT 'telecaller',
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at   DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================
-- MASTER / ADMIN DATA
-- =============================================================
CREATE TABLE IF NOT EXISTS destinations (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    state       VARCHAR(100),
    country     VARCHAR(100) NOT NULL DEFAULT 'India',
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dest_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hotel_rates (
    id                INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    destination_id    INT UNSIGNED NOT NULL,
    hotel_name        VARCHAR(200) NOT NULL,
    star_rating       ENUM('1','2','3','4','5') NOT NULL,
    room_type         ENUM('standard','deluxe','premium','luxury','suite') NOT NULL,
    meal_plan         ENUM('none','breakfast','breakfast_dinner','all_inclusive') NOT NULL DEFAULT 'none',
    charge_per_night  DECIMAL(10,2) NOT NULL CHECK (charge_per_night >= 0),
    is_active         TINYINT(1) NOT NULL DEFAULT 1,
    valid_from        DATE NULL,
    valid_till        DATE NULL,
    notes             TEXT,
    created_by        INT UNSIGNED NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
    INDEX idx_hr_dest (destination_id, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS car_types (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    capacity    INT NOT NULL DEFAULT 4,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS car_rates (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    destination_id      INT UNSIGNED NOT NULL,
    car_type_id         INT UNSIGNED NOT NULL,
    car_class           ENUM('economy','standard','premium','luxury') NOT NULL DEFAULT 'standard',
    charge_per_day      DECIMAL(10,2) NOT NULL CHECK (charge_per_day >= 0),
    km_limit_per_day    INT NOT NULL DEFAULT 250,
    extra_charge_per_km DECIMAL(8,2) NOT NULL DEFAULT 12.00,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    valid_from          DATE NULL,
    valid_till          DATE NULL,
    notes               TEXT,
    created_by          INT UNSIGNED NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE,
    FOREIGN KEY (car_type_id) REFERENCES car_types(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
    INDEX idx_cr_dest (destination_id, is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agency_settings (
    id                          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    agency_name                 VARCHAR(200) NOT NULL,
    address                     TEXT,
    phone                       VARCHAR(30),
    email                       VARCHAR(200),
    website                     VARCHAR(200),
    gstin                       VARCHAR(20),
    logo_url                    VARCHAR(500),
    default_booking_fee_pct     DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    default_markup_pct          DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    default_gst_pct             DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    default_quotation_valid_days INT NOT NULL DEFAULT 7,
    invoice_prefix              VARCHAR(20) NOT NULL DEFAULT 'INV',
    invoice_counter             INT NOT NULL DEFAULT 1000,
    updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================
-- LEADS (simplified for Quotation module)
-- =============================================================
CREATE TABLE IF NOT EXISTS leads (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(200) NOT NULL,
    email               VARCHAR(200),
    phone               VARCHAR(20) NOT NULL,
    destination_text    VARCHAR(200),
    source              VARCHAR(50) NOT NULL DEFAULT 'manual',
    notes               TEXT,
    created_by          INT UNSIGNED NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES staff_users(id) ON DELETE SET NULL,
    INDEX idx_lead_phone (phone),
    INDEX idx_lead_email (email)
) ENGINE=InnoDB;

-- =============================================================
-- QUOTATIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS quotations (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quotation_number    VARCHAR(50) NOT NULL UNIQUE,
    lead_id             INT UNSIGNED NULL,
    customer_name       VARCHAR(200) NOT NULL,
    customer_email      VARCHAR(200),
    customer_phone      VARCHAR(20) NOT NULL,
    created_by          INT UNSIGNED NOT NULL,

    destination_id      INT UNSIGNED NULL,
    destination_text    VARCHAR(200),
    trip_start_date     DATE NOT NULL,
    trip_end_date       DATE NOT NULL,
    nights              INT GENERATED ALWAYS AS (DATEDIFF(trip_end_date, trip_start_date)) STORED,
    adults              INT NOT NULL DEFAULT 1,
    children_below_5    INT NOT NULL DEFAULT 0,
    children_above_5    INT NOT NULL DEFAULT 0,
    num_rooms           INT NOT NULL DEFAULT 1,
    package_type        ENUM('hotel','car','flight','hotel_car','hotel_flight','car_flight','hotel_car_flight') NOT NULL,

    hotel_total         DECIMAL(12,2) NOT NULL DEFAULT 0,
    car_total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    flight_total        DECIMAL(12,2) NOT NULL DEFAULT 0,
    misc_total          DECIMAL(12,2) NOT NULL DEFAULT 0,
    subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
    markup_pct          DECIMAL(5,2) NOT NULL DEFAULT 0,
    markup_amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
    gst_pct             DECIMAL(5,2) NOT NULL DEFAULT 0,
    gst_amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    grand_total         DECIMAL(12,2) NOT NULL DEFAULT 0,

    status              ENUM('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
    valid_till          DATE NULL,
    terms_notes         TEXT,
    internal_notes      TEXT,
    version             INT NOT NULL DEFAULT 1,
    sent_at             DATETIME NULL,
    accepted_at         DATETIME NULL,
    rejected_at         DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES staff_users(id),
    INDEX idx_q_lead (lead_id),
    INDEX idx_q_status (status),
    INDEX idx_q_number (quotation_number),
    INDEX idx_q_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotation_hotels (
    id                      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quotation_id            INT UNSIGNED NOT NULL,
    hotel_rate_id           INT UNSIGNED NULL,
    hotel_name              VARCHAR(200) NOT NULL,
    star_rating             ENUM('1','2','3','4','5') NULL,
    room_type               ENUM('standard','deluxe','premium','luxury','suite') NOT NULL,
    meal_plan               ENUM('none','breakfast','breakfast_dinner','all_inclusive') NOT NULL DEFAULT 'none',
    charge_per_night        DECIMAL(10,2) NOT NULL,
    num_nights              INT NOT NULL,
    num_rooms               INT NOT NULL DEFAULT 1,
    special_charges         DECIMAL(10,2) NOT NULL DEFAULT 0,
    special_charges_note    VARCHAR(300),
    line_total              DECIMAL(12,2) GENERATED ALWAYS AS
                                ((charge_per_night * num_nights * num_rooms) + special_charges) STORED,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_rate_id) REFERENCES hotel_rates(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotation_cars (
    id                      INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quotation_id            INT UNSIGNED NOT NULL,
    car_rate_id             INT UNSIGNED NULL,
    car_type_name           VARCHAR(100) NOT NULL,
    car_class               ENUM('economy','standard','premium','luxury') NOT NULL DEFAULT 'standard',
    charge_per_day          DECIMAL(10,2) NOT NULL,
    num_days                INT NOT NULL,
    km_limit_per_day        INT NOT NULL DEFAULT 250,
    extra_charge_per_km     DECIMAL(8,2) NOT NULL DEFAULT 0,
    estimated_extra_km      INT NOT NULL DEFAULT 0,
    extra_km_charges        DECIMAL(10,2) GENERATED ALWAYS AS
                                (estimated_extra_km * extra_charge_per_km) STORED,
    line_total              DECIMAL(12,2) GENERATED ALWAYS AS
                                ((charge_per_day * num_days) + (estimated_extra_km * extra_charge_per_km)) STORED,
    sort_order              INT NOT NULL DEFAULT 0,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (car_rate_id) REFERENCES car_rates(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotation_flights (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quotation_id        INT UNSIGNED NOT NULL,
    airline             VARCHAR(100),
    route               VARCHAR(200),
    flight_date         DATE,
    fare_per_adult      DECIMAL(10,2) NOT NULL DEFAULT 0,
    fare_per_child      DECIMAL(10,2) NOT NULL DEFAULT 0,
    num_adults          INT NOT NULL DEFAULT 1,
    num_children        INT NOT NULL DEFAULT 0,
    line_total          DECIMAL(12,2) GENERATED ALWAYS AS
                            ((fare_per_adult * num_adults) + (fare_per_child * num_children)) STORED,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotation_misc (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quotation_id    INT UNSIGNED NOT NULL,
    label           VARCHAR(200) NOT NULL,
    amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS quotation_versions (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quotation_id    INT UNSIGNED NOT NULL,
    version_number  INT NOT NULL,
    snapshot_json   JSON NOT NULL,
    changed_by      INT UNSIGNED NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES staff_users(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- SEED DATA
-- =============================================================
INSERT INTO agency_settings (agency_name)
VALUES ('Your Travel Agency');

INSERT INTO destinations (name, state, country) VALUES
    ('Goa', 'Goa', 'India'),
    ('Manali', 'Himachal Pradesh', 'India'),
    ('Shimla', 'Himachal Pradesh', 'India'),
    ('Jaipur', 'Rajasthan', 'India'),
    ('Kerala (Munnar + Alleppey)', 'Kerala', 'India'),
    ('Andaman Islands', 'Andaman & Nicobar', 'India'),
    ('Darjeeling', 'West Bengal', 'India'),
    ('Ooty', 'Tamil Nadu', 'India'),
    ('Udaipur', 'Rajasthan', 'India'),
    ('Leh Ladakh', 'Ladakh', 'India'),
    ('Dubai', '', 'UAE'),
    ('Bangkok', '', 'Thailand'),
    ('Bali', '', 'Indonesia'),
    ('Singapore', '', 'Singapore'),
    ('Nepal (Kathmandu + Pokhara)', '', 'Nepal');

INSERT INTO car_types (name, capacity) VALUES
    ('Hatchback', 4),
    ('Sedan', 4),
    ('SUV', 6),
    ('Innova Crysta', 7),
    ('Tempo Traveller (12 Seater)', 12),
    ('Tempo Traveller (17 Seater)', 17),
    ('Mini Bus (20 Seater)', 20),
    ('Luxury Sedan', 4),
    ('Luxury SUV', 6);
