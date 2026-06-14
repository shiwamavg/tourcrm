-- =============================================================
-- Migration 024: Invoice GST fields
-- Adds fields needed for Indian GST reporting.
-- =============================================================

USE tour_crm;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS gst_pct DECIMAL(5,2) NOT NULL DEFAULT 0 AFTER subtotal,
    ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER gst_pct,
    ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER cgst_amount,
    ADD COLUMN IF NOT EXISTS igst_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER sgst_amount,
    ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20) DEFAULT '9985' AFTER igst_amount,
    ADD COLUMN IF NOT EXISTS customer_gstin VARCHAR(20) AFTER hsn_sac;
