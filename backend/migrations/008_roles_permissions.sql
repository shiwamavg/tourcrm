-- =============================================================
-- Migration 008: Roles & Permissions + User Management
-- =============================================================

USE tour_crm;

-- ── Roles table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON NOT NULL DEFAULT (JSON_OBJECT()),
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── Insert default roles ─────────────────────────────────────
INSERT INTO roles (name, slug, description, permissions) VALUES
('Super Admin', 'admin', 'Full system access – users, settings, finance, everything.', JSON_OBJECT(
    'leads', JSON_ARRAY('view','create','edit','delete','assign','convert','import','export'),
    'quotations', JSON_ARRAY('view','create','edit','delete','revise','send','download'),
    'bookings', JSON_ARRAY('view','create','edit','delete','cancel'),
    'payments', JSON_ARRAY('view','create','edit','refund','verify'),
    'invoices', JSON_ARRAY('view','create','edit','delete','download'),
    'reviews', JSON_ARRAY('view','moderate','reply','delete'),
    'users', JSON_ARRAY('view','create','edit','delete','manage_roles'),
    'settings', JSON_ARRAY('view','edit'),
    'destinations', JSON_ARRAY('view','create','edit','delete'),
    'rates', JSON_ARRAY('view','create','edit','delete'),
    'reports', JSON_ARRAY('view','export'),
    'dashboard', JSON_ARRAY('view','analytics')
)),
('Sales Manager', 'manager', 'Manages leads, quotations, bookings, and team performance.', JSON_OBJECT(
    'leads', JSON_ARRAY('view','create','edit','assign','convert','import','export'),
    'quotations', JSON_ARRAY('view','create','edit','revise','send','download'),
    'bookings', JSON_ARRAY('view','create','edit','cancel'),
    'payments', JSON_ARRAY('view','verify'),
    'invoices', JSON_ARRAY('view','download'),
    'reviews', JSON_ARRAY('view','moderate','reply'),
    'users', JSON_ARRAY('view','create','edit'),
    'settings', JSON_ARRAY('view'),
    'destinations', JSON_ARRAY('view'),
    'rates', JSON_ARRAY('view'),
    'reports', JSON_ARRAY('view','export'),
    'dashboard', JSON_ARRAY('view','analytics')
)),
('Telecaller / Sales Executive', 'telecaller', 'Handles lead calls, creates quotations, follows up.', JSON_OBJECT(
    'leads', JSON_ARRAY('view','create','edit','assign','convert'),
    'quotations', JSON_ARRAY('view','create','edit','send','download'),
    'bookings', JSON_ARRAY('view'),
    'payments', JSON_ARRAY('view'),
    'invoices', JSON_ARRAY('view','download'),
    'reviews', JSON_ARRAY('view'),
    'users', JSON_ARRAY(),
    'settings', JSON_ARRAY(),
    'destinations', JSON_ARRAY('view'),
    'rates', JSON_ARRAY('view'),
    'reports', JSON_ARRAY('view'),
    'dashboard', JSON_ARRAY('view')
)),
('Accounts', 'accounts', 'Handles payments, invoices, and financial records.', JSON_OBJECT(
    'leads', JSON_ARRAY('view'),
    'quotations', JSON_ARRAY('view','download'),
    'bookings', JSON_ARRAY('view','edit'),
    'payments', JSON_ARRAY('view','create','edit','refund','verify'),
    'invoices', JSON_ARRAY('view','create','edit','download'),
    'reviews', JSON_ARRAY('view'),
    'users', JSON_ARRAY(),
    'settings', JSON_ARRAY('view'),
    'destinations', JSON_ARRAY(),
    'rates', JSON_ARRAY(),
    'reports', JSON_ARRAY('view','export'),
    'dashboard', JSON_ARRAY('view')
))
ON DUPLICATE KEY UPDATE name=name;

-- ── Update staff_users to link to roles ───────────────────────
-- Add role_id column if not exists
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'staff_users' AND column_name = 'role_id') = 0,
    'ALTER TABLE staff_users ADD COLUMN role_id INT UNSIGNED NULL AFTER role, ADD FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Map existing roles to role_id
UPDATE staff_users su
JOIN roles r ON r.slug = su.role
SET su.role_id = r.id
WHERE su.role_id IS NULL;

-- ── Activity log for user actions ────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INT UNSIGNED,
    old_data    JSON,
    new_data    JSON,
    ip_address  VARCHAR(45),
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ── Seed additional demo users ───────────────────────────────
INSERT INTO staff_users (full_name, email, phone, password_hash, role, role_id, is_active) VALUES
('Priya Sharma', 'priya@tourcrm.local', '+91 98765 43211', '$2b$10$demohashnotreal...........................................', 'manager', 2, 1),
('Rahul Verma', 'rahul@tourcrm.local', '+91 98765 43212', '$2b$10$demohashnotreal...........................................', 'telecaller', 3, 1),
('Anita Gupta', 'anita@tourcrm.local', '+91 98765 43213', '$2b$10$demohashnotreal...........................................', 'accounts', 4, 1)
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), role_id=VALUES(role_id), is_active=VALUES(is_active);
