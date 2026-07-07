-- =============================================================
-- Migration 031: Re-link Vendor Ledgers to Suppliers Table
-- =============================================================

USE tour_crm;

DROP TABLE IF EXISTS vendor_ledgers;
DROP TABLE IF EXISTS vendors;

-- Re-create Vendor Ledgers pointing to suppliers table
CREATE TABLE IF NOT EXISTS vendor_ledgers (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL DEFAULT 1,
    booking_id      INT UNSIGNED NOT NULL,
    supplier_id     INT NOT NULL, -- references suppliers(id)
    cost_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status          ENUM('pending', 'partial', 'paid') NOT NULL DEFAULT 'pending',
    notes           TEXT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
    INDEX idx_vl_booking (booking_id),
    INDEX idx_vl_supplier (supplier_id)
) ENGINE=InnoDB;
