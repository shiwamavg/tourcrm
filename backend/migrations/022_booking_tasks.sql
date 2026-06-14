-- =============================================================
-- Migration 022: Booking task checklist
-- Pre-travel operational tasks per booking.
-- =============================================================

USE tour_crm;

CREATE TABLE IF NOT EXISTS booking_task_templates (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    due_before_days     INT NOT NULL DEFAULT 7,       -- days before trip_start_date
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_btt_company (company_id),
    INDEX idx_btt_sort (company_id, sort_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_tasks (
    id                  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id          INT UNSIGNED NOT NULL,
    booking_id          INT UNSIGNED NOT NULL,
    template_id         INT UNSIGNED NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT,
    due_date            DATE,
    is_completed        TINYINT(1) NOT NULL DEFAULT 0,
    completed_by        INT UNSIGNED NULL,
    completed_at        DATETIME,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES booking_task_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by) REFERENCES staff_users(id) ON DELETE SET NULL,
    INDEX idx_bt_booking (booking_id),
    INDEX idx_bt_due (due_date),
    INDEX idx_bt_completed (is_completed)
) ENGINE=InnoDB;

-- Seed default task templates for existing companies
INSERT INTO booking_task_templates (company_id, title, description, due_before_days, sort_order)
SELECT id, 'Collect advance payment', 'Receive booking amount / advance from customer.', 14, 1
FROM companies;

INSERT INTO booking_task_templates (company_id, title, description, due_before_days, sort_order)
SELECT id, 'Collect passport / ID copies', 'Gather passport or government ID copies for all travellers.', 10, 2
FROM companies;

INSERT INTO booking_task_templates (company_id, title, description, due_before_days, sort_order)
SELECT id, 'Confirm hotel vouchers', 'Issue and share hotel/car vouchers with customer.', 7, 3
FROM companies;

INSERT INTO booking_task_templates (company_id, title, description, due_before_days, sort_order)
SELECT id, 'Collect final payment', 'Ensure 100% payment is received before trip start.', 3, 4
FROM companies;

INSERT INTO booking_task_templates (company_id, title, description, due_before_days, sort_order)
SELECT id, 'Pre-trip welcome call', 'Call customer to confirm itinerary, pickup details, and contacts.', 1, 5
FROM companies;
