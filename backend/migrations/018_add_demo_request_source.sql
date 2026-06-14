-- =============================================================
-- Migration 018: Add demo_request lead source
-- Used by the TourCRM marketing website "Request a demo" form.
-- =============================================================

USE tour_crm;

ALTER TABLE leads
    MODIFY COLUMN source ENUM(
        'manual', 'website_form', 'google_sheet', 'csv_upload',
        'meta_ads', 'walk_in', 'referral', 'whatsapp', 'phone', 'other', 'demo_request'
    ) NOT NULL DEFAULT 'manual';
