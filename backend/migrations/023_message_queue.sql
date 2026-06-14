-- =============================================================
-- Migration 023: Message queue
-- Outbox for email/WhatsApp/SMS messages sent by schedulers.
-- =============================================================

USE tour_crm;

CREATE TABLE IF NOT EXISTS message_queue (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    entity_type     VARCHAR(50),                      -- 'lead', 'booking', 'payment_reminder'
    entity_id       INT UNSIGNED,
    channel         ENUM('email','whatsapp','sms') NOT NULL,
    recipient       VARCHAR(255) NOT NULL,
    subject         VARCHAR(255),                     -- email only
    body            TEXT NOT NULL,
    status          ENUM('pending','sent','failed','cancelled') NOT NULL DEFAULT 'pending',
    attempts        TINYINT UNSIGNED NOT NULL DEFAULT 0,
    last_error      TEXT,
    sent_at         DATETIME,
    scheduled_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_mq_company (company_id),
    INDEX idx_mq_status (status, scheduled_at),
    INDEX idx_mq_entity (entity_type, entity_id)
) ENGINE=InnoDB;
