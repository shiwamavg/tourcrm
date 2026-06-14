-- =============================================================
-- Migration 020: Payment reminder schedules
-- Configurable reminders sent X days before trip start and
-- Y days after a payment becomes overdue.
-- =============================================================

USE tour_crm;

CREATE TABLE IF NOT EXISTS payment_reminder_schedules (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    name                VARCHAR(100) NOT NULL,
    trigger_type        ENUM('before_trip','after_due') NOT NULL DEFAULT 'before_trip',
    days_offset         INT NOT NULL DEFAULT 7,       -- days before trip start or after due date
    template_id         INT UNSIGNED NOT NULL,        -- message_templates.id
    channel             ENUM('email','whatsapp','both') NOT NULL DEFAULT 'email',
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE CASCADE,
    INDEX idx_prs_company (company_id),
    INDEX idx_prs_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_reminder_logs (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    booking_id          INT UNSIGNED NOT NULL,
    schedule_id         INT UNSIGNED NOT NULL,
    template_id         INT UNSIGNED NOT NULL,
    channel             ENUM('email','whatsapp') NOT NULL,
    recipient           VARCHAR(255),                 -- email or phone
    status              ENUM('queued','sent','failed') NOT NULL DEFAULT 'queued',
    error_message       TEXT,
    sent_at             DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES payment_reminder_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE CASCADE,
    INDEX idx_prl_booking (booking_id),
    INDEX idx_prl_status (status),
    INDEX idx_prl_created (created_at)
) ENGINE=InnoDB;

-- Seed default schedules for existing companies (7 days before trip, 1 day before trip)
INSERT INTO payment_reminder_schedules (company_id, name, trigger_type, days_offset, template_id, channel)
SELECT c.id, '7 days before trip', 'before_trip', 7, t.id, 'email'
FROM companies c
JOIN message_templates t ON t.company_id = c.id AND t.category = 'payment_reminder' AND t.channel = 'email';

INSERT INTO payment_reminder_schedules (company_id, name, trigger_type, days_offset, template_id, channel)
SELECT c.id, '1 day before trip', 'before_trip', 1, t.id, 'both'
FROM companies c
JOIN message_templates t ON t.company_id = c.id AND t.category = 'payment_reminder' AND t.channel = 'whatsapp';
