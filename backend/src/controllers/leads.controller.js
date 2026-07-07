// src/controllers/leads.controller.js
// Lead pipeline with company_id filtering for SaaS multi-tenancy.

const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const db        = require('../config/db');

// ── helpers ──────────────────────────────────────────────────
const VALID_SOURCES = new Set([
    'manual', 'website_form', 'google_sheet', 'csv_upload',
    'meta_ads', 'walk_in', 'referral', 'whatsapp', 'phone', 'other', 'demo_request'
]);

const VALID_STATUSES = new Set([
    'new', 'contacted', 'qualified', 'converted', 'lost', 'junk'
]);

const sanitize = (s) => (s == null ? '' : String(s).trim());
const isEmail  = (s) => !s || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s).trim());
const isPhone  = (s) => !!s && /^[+\d][\d\s\-()]{5,20}$/.test(String(s).trim());

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') { inQ = false; }
            else { cell += ch; }
        } else {
            if (ch === '"') { inQ = true; }
            else if (ch === ',') { row.push(cell); cell = ''; }
            else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); cell = '';
                if (row.some(c => c !== '')) rows.push(row);
                row = [];
            } else { cell += ch; }
        }
    }
    if (cell !== '' || row.length) { row.push(cell); if (row.some(c => c !== '')) rows.push(row); }
    return rows;
}

// ── list ─────────────────────────────────────────────────────
const listLeads = async (req, res, next) => {
    try {
        const { status, source, assigned_to, q, page = 1, limit = 50 } = req.query;
        const where = ['l.company_id = ?'];
        const params = [req.companyId];
        if (status)        { where.push('l.status = ?');        params.push(status); }
        if (source)        { where.push('l.source = ?');        params.push(source); }
        if (assigned_to)   { where.push('l.assigned_to = ?');   params.push(assigned_to); }
        if (q) {
            where.push('(l.full_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ? OR l.destination_text LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like, like, like);
        }
        const whereSql = 'WHERE ' + where.join(' AND ');
        const offset = (Math.max(1, +page) - 1) * +limit;
        const [rows] = await db.query(
            `SELECT l.*, su.full_name AS assigned_to_name,
                    q.quotation_number AS converted_quotation_number,
                    p.title AS package_title
               FROM leads l
          LEFT JOIN staff_users su ON su.id = l.assigned_to AND su.company_id = l.company_id
          LEFT JOIN quotations  q  ON q.id  = l.converted_quotation_id AND q.company_id = l.company_id
          LEFT JOIN packages     p  ON p.id  = l.package_id AND p.company_id = l.company_id
               ${whereSql}
            ORDER BY l.id DESC
              LIMIT ? OFFSET ?`,
            [...params, +limit, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM leads l ${whereSql}`, params
        );
        res.json({ items: rows, total: count[0].total, page: +page, limit: +limit });
    } catch (err) { next(err); }
};

// ── stats ────────────────────────────────────────────────────
const leadsStats = async (req, res, next) => {
    try {
        const [byStatus] = await db.query(
            `SELECT status, COUNT(*) AS n FROM leads WHERE company_id = ? GROUP BY status`,
            [req.companyId]
        );
        const [bySource] = await db.query(
            `SELECT source, COUNT(*) AS n FROM leads WHERE company_id = ? GROUP BY source ORDER BY n DESC`,
            [req.companyId]
        );
        const [totals] = await db.query(
            `SELECT COUNT(*) AS total,
                    SUM(status = 'new') AS new_count,
                    SUM(status = 'contacted') AS contacted_count,
                    SUM(status = 'qualified') AS qualified_count,
                    SUM(status = 'converted') AS converted_count,
                    SUM(status = 'lost') AS lost_count,
                    SUM(status = 'junk') AS junk_count,
                    SUM(follow_up_at IS NOT NULL AND follow_up_at <= NOW()) AS overdue_followups
               FROM leads WHERE company_id = ?`,
            [req.companyId]
        );
        res.json({ by_status: byStatus, by_source: bySource, totals: totals[0] });
    } catch (err) { next(err); }
};

// ── get one ──────────────────────────────────────────────────
const getLead = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT l.*, su.full_name AS assigned_to_name,
                    q.quotation_number AS converted_quotation_number,
                    p.title AS package_title
               FROM leads l
          LEFT JOIN staff_users su ON su.id = l.assigned_to AND su.company_id = l.company_id
          LEFT JOIN quotations  q  ON q.id  = l.converted_quotation_id AND q.company_id = l.company_id
          LEFT JOIN packages     p  ON p.id  = l.package_id AND p.company_id = l.company_id
              WHERE l.id = ? AND l.company_id = ?`,
            [req.params.id, req.companyId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
        res.json(rows[0]);
    } catch (err) { next(err); }
};

// ── create (staff) ───────────────────────────────────────────
const createLead = async (req, res, next) => {
    try {
        const { full_name, email, phone, destination_text, package_id, source = 'manual',
                notes, assigned_to, follow_up_at, source_meta } = req.body || {};
        if (!sanitize(full_name)) return res.status(400).json({ error: 'full_name is required' });
        if (!isPhone(phone))      return res.status(400).json({ error: 'valid phone is required' });
        if (!isEmail(email))      return res.status(400).json({ error: 'valid email required (or omit)' });
        if (!VALID_SOURCES.has(source)) return res.status(400).json({ error: `source must be one of: ${[...VALID_SOURCES].join(', ')}` });

        // Check lead limit
        const [[company]] = await db.query('SELECT max_leads FROM companies WHERE id=?', [req.companyId]);
        const [[usage]] = await db.query('SELECT COUNT(*) AS count FROM leads WHERE company_id=?', [req.companyId]);
        if (company && usage.count >= company.max_leads) {
            return res.status(403).json({ error: `Lead limit of ${company.max_leads} reached. Upgrade your plan.` });
        }

        const [r] = await db.query(
            `INSERT INTO leads
                (full_name, email, phone, destination_text, package_id, source, status, assigned_to, follow_up_at, notes, source_meta, created_by, company_id)
             VALUES (?,?,?,?,?,?, 'new', ?, ?, ?, ?, ?, ?)`,
            [sanitize(full_name),
             sanitize(email) || null,
             sanitize(phone),
             sanitize(destination_text) || null,
             package_id || null,
             source,
             assigned_to || null,
             follow_up_at || null,
             sanitize(notes) || null,
             source_meta ? JSON.stringify(source_meta) : null,
             req.user?.id || null,
             req.companyId]
        );
        const [created] = await db.query('SELECT * FROM leads WHERE id = ? AND company_id = ?', [r.insertId, req.companyId]);
        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: req.companyId,
                lead_id: r.insertId,
                user_id: req.user?.id || 1,
                notes: `Lead created via manual entry.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for lead creation:', e.message);
        }
        try {
            const { startSequenceForLead } = require('./followup-sequence.controller');
            await startSequenceForLead(created[0]);
        } catch (e) {
            console.error('Failed to start follow-up sequence for lead:', e.message);
        }
        res.status(201).json(created[0]);
    } catch (err) { next(err); }
};

// ── update (staff) ───────────────────────────────────────────
const updateLead = async (req, res, next) => {
    try {
        const id = req.params.id;
        const allowed = ['full_name', 'email', 'phone', 'destination_text', 'package_id', 'notes',
                         'assigned_to', 'follow_up_at', 'source_meta'];
        const sets = []; const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                if (k === 'email' && !isEmail(req.body.email)) {
                    return res.status(400).json({ error: 'invalid email' });
                }
                if (k === 'phone' && !isPhone(req.body.phone)) {
                    return res.status(400).json({ error: 'invalid phone' });
                }
                sets.push(`${k} = ?`);
                params.push(k === 'source_meta' && typeof req.body[k] !== 'string'
                    ? JSON.stringify(req.body[k])
                    : req.body[k] || null);
            }
        }
        if (!sets.length) return res.status(400).json({ error: 'no fields to update' });
        params.push(id, req.companyId);
        const [r] = await db.query(`UPDATE leads SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, params);
        if (!r.affectedRows) return res.status(404).json({ error: 'Lead not found' });
        const [updated] = await db.query('SELECT * FROM leads WHERE id = ? AND company_id = ?', [id, req.companyId]);
        res.json(updated[0]);
    } catch (err) { next(err); }
};

// ── assign ───────────────────────────────────────────────────
const assignLead = async (req, res, next) => {
    try {
        const { assigned_to } = req.body || {};
        if (assigned_to != null) {
            const [u] = await db.query('SELECT id FROM staff_users WHERE id = ? AND company_id = ?', [assigned_to, req.companyId]);
            if (!u[0]) return res.status(400).json({ error: 'assigned_to user not found' });
        }
        const [r] = await db.query(
            'UPDATE leads SET assigned_to = ? WHERE id = ? AND company_id = ?',
            [assigned_to || null, req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Lead not found' });
        res.json({ ok: true, assigned_to: assigned_to || null });
    } catch (err) { next(err); }
};

// ── change status ────────────────────────────────────────────
const setStatus = async (req, res, next) => {
    try {
        const { status, note } = req.body || {};
        if (!VALID_STATUSES.has(status)) {
            return res.status(400).json({ error: `status must be one of: ${[...VALID_STATUSES].join(', ')}` });
        }
        // Fetch current status for milestone logging
        const [[lead]] = await db.query('SELECT status FROM leads WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const [r] = await db.query(
            'UPDATE leads SET status = ?, notes = CONCAT_WS(\'\n\', notes, ?) WHERE id = ? AND company_id = ?',
            [status, note ? `[${new Date().toISOString().slice(0,10)} ${req.user?.email || 'staff'}] ${note}` : null,
             req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Lead not found' });

        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: req.companyId,
                lead_id: req.params.id,
                user_id: req.user?.id || 1,
                notes: `Status changed from "${lead.status}" to "${status}"${note ? '. Note: ' + note : ''}`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for lead status change:', e.message);
        }

        res.json({ ok: true, status });
    } catch (err) { next(err); }
};

// ── convert to a quotation ───────────────────────────────────
const convertLead = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        const [rows] = await db.query('SELECT * FROM leads WHERE id = ? AND company_id = ?', [id, req.companyId]);
        const lead = rows[0];
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        if (lead.status === 'converted' && lead.converted_quotation_id) {
            return res.status(409).json({
                error: 'Lead already converted',
                quotation_id: lead.converted_quotation_id
            });
        }

        const year = new Date().getFullYear();
        const [[{ next }]] = await db.query(
            `SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number, 10) AS UNSIGNED)), 0) + 1 AS next
               FROM quotations WHERE quotation_number LIKE ?`,
            [`QUO-${year}-%`]
        );
        const quotation_number = `QUO-${year}-${String(next).padStart(4, '0')}`;

        const start = new Date();
        const end   = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        const isoDate = (d) => d.toISOString().slice(0, 10);

        // Check quotation limit
        const [[usage]] = await db.query(
            'SELECT COUNT(*) AS count FROM quotations WHERE company_id = ?',
            [req.companyId]
        );
        const [[company]] = await db.query('SELECT max_quotations FROM companies WHERE id = ?', [req.companyId]);
        if (company && usage.count >= company.max_quotations) {
            return res.status(403).json({ error: 'Quotation limit reached for your plan. Upgrade to create more.' });
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [qIns] = await conn.query(
                `INSERT INTO quotations
                    (quotation_number, lead_id, customer_name, customer_email, customer_phone,
                     destination_text, package_id, referrer_booking_id, trip_start_date, trip_end_date, package_type, num_rooms,
                     adults, children_below_5, children_above_5,
                     hotel_total, car_total, flight_total, misc_total, subtotal,
                     markup_pct, markup_amount, gst_pct, gst_amount, grand_total,
                     status, version, internal_notes, created_by, company_id, agent_id)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 0,0,0,0,0, 0,0,0,0,0, 'draft', 1, ?, ?, ?, ?)`,
                [quotation_number,
                 lead.id,
                 lead.full_name,
                 lead.email,
                 lead.phone,
                 lead.destination_text,
                 lead.package_id || null,
                 lead.referrer_booking_id || null,
                 isoDate(start),
                 isoDate(end),
                 'hotel_car',
                 1,
                 2, 0, 0,
                 `[Converted from lead #${lead.id} (source=${lead.source})]\n${lead.notes || ''}`.trim(),
                 req.user?.id || null,
                 req.companyId,
                 lead.agent_id || null]
            );
            await conn.query(
                'UPDATE leads SET status = ?, converted_quotation_id = ? WHERE id = ? AND company_id = ?',
                ['converted', qIns.insertId, id, req.companyId]
            );
            try {
                const { logFollowup } = require('../services/followup.service');
                await logFollowup(conn, {
                    company_id: req.companyId,
                    lead_id: id,
                    quotation_id: qIns.insertId,
                    user_id: req.user?.id || 1,
                    notes: `Lead converted to Quotation ${quotation_number}.`,
                    is_system: 1
                });
            } catch (e) {
                console.error('Failed to log system milestone for lead conversion:', e.message);
            }
            await conn.commit();
            res.status(201).json({
                ok: true,
                quotation_id: qIns.insertId,
                quotation_number,
                lead_id: id
            });
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally { conn.release(); }
    } catch (err) { next(err); }
};

// ── CSV helpers ──────────────────────────────────────────────
function extractCsvRows(buffer, originalname) {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('CSV is empty (need header + at least 1 data row)');
    const header = rows[0].map(h => h.trim().toLowerCase());
    const idx = (name) => header.indexOf(name);
    const get = (row, name) => {
        const i = idx(name);
        return i >= 0 ? sanitize(row[i]) : '';
    };
    const required = ['full_name', 'phone'];
    for (const r of required) {
        if (idx(r) < 0) throw new Error(`CSV is missing required column: ${r}`);
    }
    const items = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const full_name = get(row, 'full_name');
        const phone     = get(row, 'phone');
        const email     = get(row, 'email');
        const dest      = get(row, 'destination_text');
        const source    = get(row, 'source') || 'csv_upload';
        const notes     = get(row, 'notes');
        const follow_up = get(row, 'follow_up_at');

        const errors = [];
        if (!full_name) errors.push('missing full_name');
        if (!isPhone(phone)) errors.push('invalid phone');
        if (email && !isEmail(email)) errors.push('invalid email');
        if (source && !VALID_SOURCES.has(source)) errors.push(`invalid source "${source}"`);

        items.push({
            row: r + 1,
            full_name,
            phone,
            email: email || null,
            destination_text: dest || null,
            source,
            notes: notes || null,
            follow_up_at: follow_up || null,
            valid: errors.length === 0,
            errors
        });
    }
    return { header, items, filename: originalname };
}

// ── bulk CSV preview ─────────────────────────────────────────
const previewBulkImport = async (req, res, next) => {
    try {
        if (!req.file?.buffer) return res.status(400).json({ error: 'CSV file required (multipart field "file")' });
        const { items } = extractCsvRows(req.file.buffer, req.file.originalname);
        const validCount = items.filter(i => i.valid).length;
        const invalidCount = items.length - validCount;
        res.json({ ok: true, total: items.length, valid: validCount, invalid: invalidCount, items });
    } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── bulk CSV import ────────────────────────────────────────
const bulkImport = async (req, res, next) => {
    try {
        if (!req.file?.buffer) return res.status(400).json({ error: 'CSV file required (multipart field "file")' });
        const { items, filename } = extractCsvRows(req.file.buffer, req.file.originalname);

        // Check lead limit
        const [[usage]] = await db.query(
            'SELECT COUNT(*) AS count FROM leads WHERE company_id = ?',
            [req.companyId]
        );
        const [[company]] = await db.query('SELECT max_leads FROM companies WHERE id = ?', [req.companyId]);
        if (company && usage.count + items.filter(i => i.valid).length > company.max_leads) {
            return res.status(403).json({ error: 'Import would exceed your lead limit. Upgrade your plan.' });
        }

        const inserted = [], skipped = [];
        for (const item of items) {
            if (!item.valid) { skipped.push({ row: item.row, reason: item.errors.join('; ') }); continue; }
            const [ins] = await db.query(
                `INSERT INTO leads
                    (full_name, email, phone, destination_text, source, status, notes, follow_up_at, source_meta, created_by, company_id)
                 VALUES (?,?,?,?,?, 'new', ?, ?, ?, ?, ?)`,
                [item.full_name,
                 item.email,
                 item.phone,
                 item.destination_text,
                 item.source,
                 item.notes,
                 item.follow_up_at,
                 JSON.stringify({ import_file: filename, row: item.row }),
                 req.user?.id || null,
                 req.companyId]
            );
            inserted.push({ row: item.row, id: ins.insertId, name: item.full_name });
            try {
                const { logFollowup } = require('../services/followup.service');
                await logFollowup(null, {
                    company_id: req.companyId,
                    lead_id: ins.insertId,
                    user_id: req.user?.id || 1,
                    notes: `Lead created via CSV import (${filename}, row ${item.row}).`,
                    is_system: 1
                });
            } catch (e) {
                console.error('Failed to log system milestone for bulk import:', e.message);
            }
        }
        res.status(201).json({ ok: true, inserted: inserted.length, skipped: skipped.length, inserted_items: inserted, skipped_items: skipped });
    } catch (err) { next(err); }
};

// ── public website-form submit ───────────────────────────────
const publicCreate = async (req, res) => {
    const { full_name, email, phone, destination_text, travel_date, travellers, budget, notes, company_id } = req.body || {};
    const targetCompanyId = company_id || 1; // default for backward compatibility

    if (!sanitize(full_name))         return res.status(400).json({ error: 'Please tell us your name.' });
    if (!isPhone(phone))              return res.status(400).json({ error: 'Please provide a valid phone number.' });
    if (!sanitize(email) || !isEmail(email)) return res.status(400).json({ error: 'Please provide a valid email.' });
    if (!sanitize(destination_text))  return res.status(400).json({ error: 'Where would you like to travel?' });

    // Verify company exists and is active
    const [[comp]] = await db.query('SELECT id, status FROM companies WHERE id = ?', [targetCompanyId]);
    if (!comp || comp.status !== 'active') {
        return res.status(403).json({ error: 'Company not found or inactive.' });
    }

    const composedNotes = [
        travellers ? `Travellers: ${travellers}` : '',
        travel_date ? `Travel date: ${travel_date}` : '',
        budget      ? `Budget: ₹${budget}` : '',
        notes       ? sanitize(notes) : ''
    ].filter(Boolean).join(' · ');

    const source = VALID_SOURCES.has(req.body?.source) ? req.body.source : 'website_form';
    const sourceLabel = source === 'demo_request' ? 'Demo Request' : 'Website Form';

    try {
        const [ins] = await db.query(
            `INSERT INTO leads
                (full_name, email, phone, destination_text, source, status, notes, source_meta, company_id)
             VALUES (?,?,?,?, ?, 'new', ?, ?, ?)`,
            [sanitize(full_name),
             sanitize(email) || null,
             sanitize(phone),
             sanitize(destination_text),
             source,
             composedNotes || null,
             JSON.stringify({
                 ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                 ua: req.headers['user-agent'] || null,
                 referer: req.headers['referer'] || null
             }),
             targetCompanyId]
        );
        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: targetCompanyId,
                lead_id: ins.insertId,
                user_id: 1, // System admin
                notes: `Lead created via ${sourceLabel}.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for public website lead:', e.message);
        }
        const [created] = await db.query('SELECT * FROM leads WHERE id = ?', [ins.insertId]);
        try {
            const { startSequenceForLead } = require('./followup-sequence.controller');
            await startSequenceForLead(created[0]);
        } catch (e) {
            console.error('Failed to start follow-up sequence for public lead:', e.message);
        }

        res.status(201).json({
            ok: true,
            lead_id: ins.insertId,
            message: 'Thank you! Our travel team will get back to you within 24 hours.'
        });
    } catch (err) {
        console.error('public lead insert failed', err.message);
        res.status(500).json({ error: 'Could not submit your request. Please try again later.' });
    }
};

// ── Meta-ads lead-form webhook ───────────────────────────────
const metaAdsWebhook = async (req, res) => {
    const sig  = req.get('X-Hub-Signature-256') || '';
    const raw  = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body)));
    const metaSecret = process.env.META_APP_SECRET;
    if (metaSecret) {
        const expected = 'sha256=' + crypto.createHmac('sha256', metaSecret).update(raw).digest('hex');
        if (sig !== expected) {
            console.warn('[meta-ads webhook] bad signature');
            return res.status(401).json({ error: 'invalid signature' });
        }
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const entries = body.entry || [];
    const created = [];

    // For SaaS, we need a company_id mapping from Meta. Default to 1 for now.
    const targetCompanyId = body.company_id || 1;

    for (const e of entries) {
        for (const ch of (e.changes || [])) {
            const v = ch.value || {};
            const fields = {};
            for (const f of (v.field_data || [])) fields[f.name] = f.values?.[0];
            if (!fields.full_name && !fields.first_name) continue;
            const fullName = fields.full_name || `${fields.first_name || ''} ${fields.last_name || ''}`.trim();
            const [r] = await db.query(
                `INSERT INTO leads
                    (full_name, email, phone, destination_text, source, status, source_meta, company_id)
                 VALUES (?,?,?,?, 'meta_ads', 'new', ?, ?)`,
                [sanitize(fullName) || '(unknown)',
                 sanitize(fields.email) || null,
                 sanitize(fields.phone) || null,
                 sanitize(fields.destination || fields.destination_text || fields.message || null),
                 JSON.stringify({ leadgen_id: v.leadgen_id, form_id: v.form_id, page_id: v.page_id, ad_id: v.ad_id, fields, ip: req.headers['x-forwarded-for'] }),
                 targetCompanyId]
            );
            created.push(r.insertId);
            try {
                const { logFollowup } = require('../services/followup.service');
                await logFollowup(null, {
                    company_id: targetCompanyId,
                    lead_id: r.insertId,
                    user_id: 1, // System admin
                    notes: `Lead created via Meta Ads Lead Form.`,
                    is_system: 1
                });
            } catch (e) {
                console.error('Failed to log system milestone for Meta Ads lead:', e.message);
            }
        }
    }
    res.json({ ok: true, created_count: created.length, lead_ids: created });
};

// ── download sample CSV ────────────────────────────────────
const downloadSampleCsv = (req, res) => {
    const header = 'full_name,phone,email,destination_text,source,notes,follow_up_at\n';
    const sample = [
        'Rajesh Sharma,+91 98765 43210,rajesh@example.com,Gangtok + Pelling 5 days,phone,Called on 5th June - interested in group tour,2026-06-15 10:00',
        'Priya Das,+91 91234 56789,priya@example.com,Lachung + Yumthang,walk_in,Walked in on Saturday - family of 4,2026-06-10 14:30',
        'Sanjay Kumar,+91 99887 66554,sanjay@example.com,Darjeeling + Kalimpong,referral,Referred by Mr. Gupta,2026-06-20 09:00'
    ].join('\n') + '\n';
    const csv = header + sample;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads-sample.csv"');
    res.send(csv);
};

// ── follow-ups ─────────────────────────────────────────────
const todayFollowups = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const where = ['l.company_id = ?', 'l.follow_up_at IS NOT NULL', 'DATE(l.follow_up_at) = CURDATE()'];
        const params = [req.companyId];
        if (userId) { where.push('l.assigned_to = ?'); params.push(userId); }
        const [rows] = await db.query(
            `SELECT l.*, su.full_name AS assigned_to_name
               FROM leads l
          LEFT JOIN staff_users su ON su.id = l.assigned_to AND su.company_id = l.company_id
              WHERE ${where.join(' AND ')}
           ORDER BY l.follow_up_at ASC`,
            params
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const overdueFollowups = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const where = ['l.company_id = ?', 'l.follow_up_at IS NOT NULL', 'l.follow_up_at < NOW()', "l.status NOT IN ('converted','lost')"];
        const params = [req.companyId];
        if (userId) { where.push('l.assigned_to = ?'); params.push(userId); }
        const [rows] = await db.query(
            `SELECT l.*, su.full_name AS assigned_to_name
               FROM leads l
          LEFT JOIN staff_users su ON su.id = l.assigned_to AND su.company_id = l.company_id
              WHERE ${where.join(' AND ')}
           ORDER BY l.follow_up_at ASC`,
            params
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const allFollowups = async (req, res, next) => {
    try {
        const { days = 7 } = req.query;
        const [rows] = await db.query(
            `SELECT l.*, su.full_name AS assigned_to_name
               FROM leads l
          LEFT JOIN staff_users su ON su.id = l.assigned_to AND su.company_id = l.company_id
              WHERE l.company_id = ? AND l.follow_up_at IS NOT NULL
                AND l.follow_up_at >= NOW()
                AND l.follow_up_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
                AND l.status NOT IN ('converted','lost')
           ORDER BY l.follow_up_at ASC`,
            [req.companyId, +days]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

module.exports = {
    listLeads, leadsStats, getLead, createLead, updateLead, assignLead,
    setStatus, convertLead, previewBulkImport, bulkImport, publicCreate, metaAdsWebhook,
    downloadSampleCsv, todayFollowups, overdueFollowups, allFollowups
};
