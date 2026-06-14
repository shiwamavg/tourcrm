-- Migration: 012_competitor_features.sql
-- Adds tables for supplier management, itinerary builder, task management, traveller profiles, reminders, and WhatsApp config

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type ENUM('hotel','transport','restaurant','activity','guide','other') DEFAULT 'other',
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    commission_percent DECIMAL(5,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    notes TEXT,
    status ENUM('active','inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_type (type),
    INDEX idx_status (status)
);

-- Itineraries
CREATE TABLE IF NOT EXISTS itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    customer_id INT,
    quotation_id INT,
    booking_id INT,
    start_date DATE,
    end_date DATE,
    total_days INT,
    destination_ids JSON,
    status ENUM('draft','confirmed','in_progress','completed','cancelled') DEFAULT 'draft',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
);

-- Itinerary Days
CREATE TABLE IF NOT EXISTS itinerary_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    itinerary_id INT NOT NULL,
    day_number INT NOT NULL,
    date DATE,
    title VARCHAR(255),
    description TEXT,
    hotel_id INT,
    meal_plan VARCHAR(50),
    transport_type VARCHAR(100),
    activities JSON,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_itinerary (itinerary_id),
    INDEX idx_company (company_id)
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INT,
    lead_id INT,
    booking_id INT,
    quotation_id INT,
    due_date DATETIME,
    priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
    status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
    reminder_at DATETIME,
    completed_at DATETIME,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_assigned (assigned_to),
    INDEX idx_status (status),
    INDEX idx_due (due_date)
);

-- Traveller Profiles
CREATE TABLE IF NOT EXISTS travellers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    lead_id INT,
    booking_id INT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(100),
    date_of_birth DATE,
    gender ENUM('male','female','other') DEFAULT NULL,
    passport_number VARCHAR(100),
    passport_expiry DATE,
    nationality VARCHAR(100),
    dietary_requirements TEXT,
    medical_notes TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_lead (lead_id),
    INDEX idx_booking (booking_id)
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    remind_at DATETIME NOT NULL,
    entity_type ENUM('lead','booking','quotation','task','general') DEFAULT 'general',
    entity_id INT,
    user_id INT,
    sent_at TIMESTAMP NULL,
    channel ENUM('email','sms','whatsapp','in_app') DEFAULT 'in_app',
    status ENUM('pending','sent','failed','dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_remind_at (remind_at),
    INDEX idx_status (status),
    INDEX idx_entity (entity_type, entity_id)
);

-- WhatsApp Config
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL UNIQUE,
    provider ENUM('twilio','messagebird','wati','whatsapp_business_api') DEFAULT 'twilio',
    api_key VARCHAR(500),
    api_secret VARCHAR(500),
    phone_number VARCHAR(50),
    webhook_url VARCHAR(500),
    enabled TINYINT(1) DEFAULT 0,
    welcome_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id)
);

-- Email Campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    recipient_filter TEXT,
    sent_count INT DEFAULT 0,
    open_count INT DEFAULT 0,
    click_count INT DEFAULT 0,
    status ENUM('draft','scheduled','sending','sent','paused') DEFAULT 'draft',
    scheduled_at DATETIME,
    sent_at TIMESTAMP NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_status (status)
);

-- Fixed Departures
CREATE TABLE IF NOT EXISTS fixed_departures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    destination VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_seats INT DEFAULT 20,
    booked_seats INT DEFAULT 0,
    price_per_person DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    status ENUM('open','full','closed','cancelled') DEFAULT 'open',
    description TEXT,
    inclusions TEXT,
    exclusions TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_status (status),
    INDEX idx_dates (start_date, end_date)
);

-- Visas
CREATE TABLE IF NOT EXISTS visas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    traveller_id INT,
    booking_id INT,
    visa_type VARCHAR(100),
    country VARCHAR(100),
    application_date DATE,
    issue_date DATE,
    expiry_date DATE,
    status ENUM('applied','approved','rejected','expired','cancelled') DEFAULT 'applied',
    document_url VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company (company_id),
    INDEX idx_traveller (traveller_id),
    INDEX idx_status (status)
);

-- Currencies
CREATE TABLE IF NOT EXISTS currencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    code VARCHAR(10) NOT NULL,
    name VARCHAR(100),
    symbol VARCHAR(10),
    exchange_rate DECIMAL(12,6) DEFAULT 1.000000,
    is_default TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_company_code (company_id, code),
    INDEX idx_company (company_id)
);

-- Landing Pages
CREATE TABLE IF NOT EXISTS landing_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    meta_description TEXT,
    hero_title VARCHAR(255),
    hero_subtitle TEXT,
    hero_image_url VARCHAR(500),
    content JSON,
    css_custom TEXT,
    is_published TINYINT(1) DEFAULT 0,
    lead_form_fields JSON,
    seo_keywords TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_company_slug (company_id, slug),
    INDEX idx_company (company_id),
    INDEX idx_published (is_published)
);
