-- 006_agency_settings_extras.sql
-- Adds bank details (for invoice PDF) and Cashfree config columns.
USE tour_crm;

ALTER TABLE agency_settings
    ADD COLUMN bank_name            VARCHAR(100) NULL AFTER invoice_counter,
    ADD COLUMN bank_account_no      VARCHAR(40)  NULL AFTER bank_name,
    ADD COLUMN bank_ifsc            VARCHAR(20)  NULL AFTER bank_account_no,
    ADD COLUMN bank_branch          VARCHAR(100) NULL AFTER bank_ifsc,
    ADD COLUMN cashfree_app_id      VARCHAR(80)  NULL AFTER bank_branch,
    ADD COLUMN cashfree_secret_key  VARCHAR(200) NULL AFTER cashfree_app_id,
    ADD COLUMN cashfree_webhook_secret VARCHAR(200) NULL AFTER cashfree_secret_key,
    ADD COLUMN cashfree_env         ENUM('TEST','PROD') NOT NULL DEFAULT 'TEST' AFTER cashfree_webhook_secret;
