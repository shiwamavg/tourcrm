-- =============================================================
-- Migration 021: Auto-follow-up sequences
-- Nurture leads with a series of timed email/WhatsApp/call steps.
-- =============================================================

USE tour_crm;

CREATE TABLE IF NOT EXISTS followup_sequences (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id  INT UNSIGNED NOT NULL,
    name        VARCHAR(150) NOT NULL,
    source      VARCHAR(50),                          -- apply to leads from this source; NULL = all
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_fs_company (company_id),
    INDEX idx_fs_source (source),
    INDEX idx_fs_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS followup_sequence_steps (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    sequence_id     INT UNSIGNED NOT NULL,
    step_order      INT UNSIGNED NOT NULL DEFAULT 1,
    delay_days      INT UNSIGNED NOT NULL DEFAULT 0,
    delay_hours     INT UNSIGNED NOT NULL DEFAULT 0,
    action_type     ENUM('email','whatsapp','sms','call_task','system_note') NOT NULL DEFAULT 'email',
    template_id     INT UNSIGNED NULL,                -- for email/whatsapp/sms
    subject         VARCHAR(255),                     -- override for email
    body            TEXT,                             -- override body (or note text)
    followup_type   VARCHAR(30),                      -- for call_task: 'call', 'whatsapp', etc.
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sequence_id) REFERENCES followup_sequences(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL,
    INDEX idx_fss_sequence (sequence_id),
    INDEX idx_fss_order (sequence_id, step_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lead_sequences (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    lead_id             INT UNSIGNED NOT NULL,
    sequence_id         INT UNSIGNED NOT NULL,
    current_step_index  INT UNSIGNED NOT NULL DEFAULT 0, -- 0-based index into ordered steps
    status              ENUM('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
    started_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at        DATETIME,
    next_run_at         DATETIME,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (sequence_id) REFERENCES followup_sequences(id) ON DELETE CASCADE,
    INDEX idx_ls_lead (lead_id),
    INDEX idx_ls_next_run (next_run_at, status),
    UNIQUE KEY uq_ls_lead_seq (lead_id, sequence_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lead_sequence_logs (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    lead_sequence_id INT UNSIGNED NOT NULL,
    step_id         INT UNSIGNED NULL,
    action_type     VARCHAR(30) NOT NULL,
    status          ENUM('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
    recipient       VARCHAR(255),
    error_message   TEXT,
    sent_at         DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_sequence_id) REFERENCES lead_sequences(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES followup_sequence_steps(id) ON DELETE SET NULL,
    INDEX idx_lsl_lead_seq (lead_sequence_id),
    INDEX idx_lsl_status (status)
) ENGINE=InnoDB;
