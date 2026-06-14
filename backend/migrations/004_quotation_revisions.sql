-- 004_quotation_revisions.sql
-- Adds revision tracking to quotations so staff can issue revised quotes
-- upon customer request without losing history. Follows the "immutable
-- revisions" pattern: every edit creates a new quotation row linked to its
-- parent; the previous one is marked 'superseded'.
--
-- Note: this migration is split from the original 004 that failed halfway.
-- The status-enum change is already in place from the first run; only the
-- columns need adding here.

USE tour_crm;

-- Add only the missing columns. The 'superseded' enum value was already
-- added in the first (partial) run, so we don't repeat it.
ALTER TABLE quotations
    ADD COLUMN parent_quotation_id INT UNSIGNED NULL AFTER lead_id,
    ADD COLUMN revision_note       VARCHAR(500) NULL AFTER parent_quotation_id;

ALTER TABLE quotations
    ADD CONSTRAINT fk_quot_parent
        FOREIGN KEY (parent_quotation_id) REFERENCES quotations(id)
        ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX idx_quot_parent ON quotations(parent_quotation_id);
