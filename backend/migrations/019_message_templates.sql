-- =============================================================
-- Migration 019: Message templates
-- Reusable templates for emails, SMS, and WhatsApp messages.
-- Used by payment reminders, follow-ups, and auto-sequences.
-- =============================================================

USE tour_crm;

CREATE TABLE IF NOT EXISTS message_templates (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id  INT UNSIGNED NOT NULL,
    name        VARCHAR(150) NOT NULL,
    channel     ENUM('email','sms','whatsapp') NOT NULL DEFAULT 'email',
    subject     VARCHAR(255),                       -- used for email
    body        TEXT NOT NULL,
    placeholders JSON,                              -- e.g. ["full_name", "destination", "amount"]
    category    VARCHAR(50),                        -- e.g. 'payment_reminder', 'follow_up', 'welcome'
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_mt_company (company_id),
    INDEX idx_mt_category (category),
    INDEX idx_mt_channel (channel)
) ENGINE=InnoDB;

-- Default payment reminder templates for every existing company
INSERT INTO message_templates (company_id, name, channel, subject, body, placeholders, category)
SELECT id,
       'Payment Reminder - Email',
       'email',
       'Reminder: Payment due for your trip to {{destination}}',
       'Dear {{full_name}},\n\nThis is a friendly reminder that a payment of {{amount}} is due for your upcoming trip to {{destination}} (Booking: {{booking_number}}).\n\nPlease make the payment at your earliest convenience or contact us if you need assistance.\n\nThank you,\n{{agency_name}}',
       JSON_ARRAY('full_name', 'destination', 'amount', 'booking_number', 'agency_name'),
       'payment_reminder'
FROM companies;

INSERT INTO message_templates (company_id, name, channel, subject, body, placeholders, category)
SELECT id,
       'Payment Reminder - WhatsApp',
       'whatsapp',
       NULL,
       'Hi {{full_name}}, reminder: payment of {{amount}} is due for your trip to {{destination}} ({{booking_number}}). Please pay soon. - {{agency_name}}',
       JSON_ARRAY('full_name', 'destination', 'amount', 'booking_number', 'agency_name'),
       'payment_reminder'
FROM companies;
