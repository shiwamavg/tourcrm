-- =============================================================
-- Migration 017: Staff login logs for super-admin audit
-- Tracks every staff (agency) login attempt with company scope.
-- =============================================================

USE tour_crm;

CREATE TABLE IF NOT EXISTS staff_login_logs (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id  INT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED,
    email       VARCHAR(200),
    status      ENUM('success','failed') NOT NULL DEFAULT 'failed',
    reason      VARCHAR(100),
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES staff_users(id) ON DELETE SET NULL,
    INDEX idx_sll_company (company_id),
    INDEX idx_sll_user (user_id),
    INDEX idx_sll_status (status),
    INDEX idx_sll_created (created_at)
) ENGINE=InnoDB;
