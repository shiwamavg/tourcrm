-- Migration: 013_itinerary_active.sql
-- Replaces status ENUM with is_active boolean on itineraries

ALTER TABLE itineraries
    ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1 AFTER total_days;

-- Migrate existing data: keep active for draft/confirmed/in_progress, inactive for completed/cancelled
UPDATE itineraries SET is_active = 1 WHERE status IN ('draft','confirmed','in_progress') OR status IS NULL;
UPDATE itineraries SET is_active = 0 WHERE status IN ('completed','cancelled');

ALTER TABLE itineraries
    DROP INDEX idx_status,
    DROP COLUMN status,
    ADD INDEX idx_active (is_active);
