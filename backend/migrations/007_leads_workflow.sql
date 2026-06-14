-- ─────────────────────────────────────────────────────────────
-- 007_leads_workflow.sql
-- Adds the sales-pipeline workflow to leads:
--   * status        – new → contacted → qualified → converted | lost
--   * assigned_to   – staff user who owns the lead
--   * follow_up_at  – next follow-up datetime
--   * source_meta   – raw payload from the source (Meta-ads form, CSV row, etc.)
--
-- Also extends the `source` ENUM to include meta_ads, csv_upload, walk_in,
-- referral, and the existing website_form / google_sheet / manual.
--
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE leads
    MODIFY COLUMN source ENUM(
        'manual', 'website_form', 'google_sheet', 'csv_upload',
        'meta_ads', 'walk_in', 'referral', 'whatsapp', 'phone', 'other'
    ) NOT NULL DEFAULT 'manual';

-- Add the new columns (skip if they already exist from a partial run)
SET @col_status := (SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_schema = DATABASE()
                      AND table_name = 'leads'
                      AND column_name = 'status');
SET @sql := IF(@col_status = 0,
    'ALTER TABLE leads ADD COLUMN status ENUM(''new'',''contacted'',''qualified'',''converted'',''lost'')
         NOT NULL DEFAULT ''new'' AFTER source',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_assigned := (SELECT COUNT(*) FROM information_schema.columns
                      WHERE table_schema = DATABASE()
                        AND table_name = 'leads'
                        AND column_name = 'assigned_to');
SET @sql := IF(@col_assigned = 0,
    'ALTER TABLE leads ADD COLUMN assigned_to INT UNSIGNED NULL AFTER status,
     ADD CONSTRAINT fk_leads_assigned_to FOREIGN KEY (assigned_to)
         REFERENCES staff_users(id) ON UPDATE CASCADE ON DELETE SET NULL',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_followup := (SELECT COUNT(*) FROM information_schema.columns
                      WHERE table_schema = DATABASE()
                        AND table_name = 'leads'
                        AND column_name = 'follow_up_at');
SET @sql := IF(@col_followup = 0,
    'ALTER TABLE leads ADD COLUMN follow_up_at DATETIME NULL AFTER assigned_to',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_meta := (SELECT COUNT(*) FROM information_schema.columns
                  WHERE table_schema = DATABASE()
                    AND table_name = 'leads'
                    AND column_name = 'source_meta');
SET @sql := IF(@col_meta = 0,
    'ALTER TABLE leads ADD COLUMN source_meta JSON NULL AFTER notes',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col_conv := (SELECT COUNT(*) FROM information_schema.columns
                  WHERE table_schema = DATABASE()
                    AND table_name = 'leads'
                    AND column_name = 'converted_quotation_id');
SET @sql := IF(@col_conv = 0,
    'ALTER TABLE leads ADD COLUMN converted_quotation_id INT UNSIGNED NULL AFTER status,
     ADD CONSTRAINT fk_leads_converted_quotation FOREIGN KEY (converted_quotation_id)
         REFERENCES quotations(id) ON UPDATE CASCADE ON DELETE SET NULL',
    'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Indexes (skip if exist)
SET @idx_status := (SELECT COUNT(*) FROM information_schema.statistics
                    WHERE table_schema = DATABASE()
                      AND table_name = 'leads' AND index_name = 'idx_leads_status');
SET @sql := IF(@idx_status = 0,
    'CREATE INDEX idx_leads_status ON leads(status)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx_assigned := (SELECT COUNT(*) FROM information_schema.statistics
                      WHERE table_schema = DATABASE()
                        AND table_name = 'leads' AND index_name = 'idx_leads_assigned');
SET @sql := IF(@idx_assigned = 0,
    'CREATE INDEX idx_leads_assigned ON leads(assigned_to)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @idx_source := (SELECT COUNT(*) FROM information_schema.statistics
                    WHERE table_schema = DATABASE()
                      AND table_name = 'leads' AND index_name = 'idx_leads_source');
SET @sql := IF(@idx_source = 0,
    'CREATE INDEX idx_leads_source ON leads(source)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─────────────────────────────────────────────────────────────
-- Seed additional demo leads so the new module is interesting
-- out of the box. Existing 5 leads get a variety of statuses.
-- ─────────────────────────────────────────────────────────────
UPDATE leads SET status = 'qualified',     assigned_to = 1, follow_up_at = '2026-06-07 10:00:00' WHERE id = 1;
UPDATE leads SET status = 'contacted',     assigned_to = 1, follow_up_at = '2026-06-06 15:30:00' WHERE id = 2;
UPDATE leads SET status = 'new',           assigned_to = NULL, follow_up_at = '2026-06-06 11:00:00' WHERE id = 3;
UPDATE leads SET status = 'new',           assigned_to = NULL                                       WHERE id = 4;
UPDATE leads SET status = 'lost',          assigned_to = 1, notes = 'Already booked Bhutan via another agent' WHERE id = 5;

-- Note: 3 of these seeded leads already have a quotation linked (QUO-2025-0001/2/3
-- were created from leads 1/2/4 in the original schema). Reflect that conversion
-- in `status` so the UI is realistic. We only update `status` (not the
-- `converted_quotation_id` reverse pointer) to keep this migration read-only.
UPDATE leads SET status = 'converted' WHERE id IN (1, 2, 4);

INSERT INTO leads (full_name, email, phone, destination_text, source, status, assigned_to, follow_up_at, notes, source_meta) VALUES
  ('Karishma Rai',   'karishma.rai@gmail.com',   '9800111222', 'Gangtok + Nathula + Tsomgo',  'meta_ads',     'new',        NULL, '2026-06-08 09:30:00', 'Came via "Sikkim tour package" lead form ad', JSON_OBJECT('ad_id','meta_ads_demo_001','campaign','Sikkim-2026-Q2','form_name','Sikkim Tour Inquiry')),
  ('Thomas Mitchell','thomas.m@outlook.com',     '9800333444', 'Darjeeling + Sikkim 7 days',  'website_form', 'new',        1,    '2026-06-06 16:00:00', 'Solo British traveller, wants tea-estate stay', JSON_OBJECT('page','/packages','referrer','google.com')),
  ('Anita Pradhan',  'anita.pradhan@yahoo.com',  '9800555666', 'Pelling + Ravangla + Namchi', 'csv_upload',   'contacted',  1,    '2026-06-07 12:00:00', 'Imported from offline spreadsheet 2026-05-20', JSON_OBJECT('import_file','leads_2026_05_20.csv','row',17)),
  ('Lakpa Sherpa',   'lakpa.s@rediffmail.com',   '9800777888', 'Dzongri trek',               'walk_in',      'qualified',  1,    '2026-06-09 11:00:00', 'Walked into Gangtok office; budget ~25k per person', JSON_OBJECT('office_visit','2026-06-04')),
  ('Sunita Tamang',  'sunita.tamang@gmail.com',  '9800999000', 'Bhutan 6 days tour',          'referral',     'new',        NULL, '2026-06-08 14:00:00', 'Referred by Priya Thapa (BKG-2025-0001)', JSON_OBJECT('referrer_lead_id',2)),
  ('Vikram Bedi',    'vikram.bedi@hotmail.com',  '9801112233', 'Ladakh 8 days',               'whatsapp',     'new',        NULL, '2026-06-08 18:00:00', 'WhatsApp inquiry: prefers bike tour, late June', JSON_OBJECT('wa_number','+919801112233'))
;
