const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ── List leads ───────────────────────────────────────────────────
const getLeads = async (req, res, next) => {
    try {
        const {
            status, source, assigned_to, page = 1, limit = 20,
            search, follow_up_due, from_date, to_date
        } = req.query;

        const conditions = [];
        const params = [];
        let p = 1;

        if (status) { conditions.push(`l.status = $${p++}`); params.push(status); }
        if (source) { conditions.push(`l.source = $${p++}`); params.push(source); }
        if (assigned_to) { conditions.push(`l.assigned_to = $${p++}`); params.push(assigned_to); }
        if (search) {
            conditions.push(`(l.full_name ILIKE $${p} OR l.phone ILIKE $${p} OR l.email ILIKE $${p})`);
            params.push(`%${search}%`); p++;
        }
        if (follow_up_due === 'true') {
            conditions.push(`l.follow_up_at <= NOW() AND l.status NOT IN ('converted','not_converted','junked')`);
        }
        if (from_date) { conditions.push(`l.created_at >= $${p++}`); params.push(from_date); }
        if (to_date)   { conditions.push(`l.created_at <= $${p++}`); params.push(to_date); }

        // Telecallers only see their own leads
        if (req.user.role === 'telecaller') {
            conditions.push(`l.assigned_to = $${p++}`);
            params.push(req.user.id);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (Number(page) - 1) * Number(limit);

        const countResult = await db.query(
            `SELECT COUNT(*) FROM leads l ${where}`, params
        );

        params.push(Number(limit));
        params.push(offset);

        const result = await db.query(`
            SELECT
                l.id, l.full_name, l.phone, l.email, l.source, l.status,
                l.destination_text, l.travel_date_approx, l.follow_up_at,
                l.budget_approx, l.created_at,
                d.name AS destination_name,
                su.full_name AS assigned_to_name,
                (SELECT COUNT(*) FROM lead_follow_ups lf WHERE lf.lead_id = l.id) AS follow_up_count
            FROM leads l
            LEFT JOIN destinations d ON d.id = l.destination_id
            LEFT JOIN staff_users su ON su.id = l.assigned_to
            ${where}
            ORDER BY l.created_at DESC
            LIMIT $${p++} OFFSET $${p++}
        `, params);

        res.json({
            data: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: Number(page),
            limit: Number(limit)
        });
    } catch (err) { next(err); }
};

// ── Get single lead ──────────────────────────────────────────────
const getLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT
                l.*,
                d.name AS destination_name,
                su.full_name AS assigned_to_name,
                c.full_name AS customer_name
            FROM leads l
            LEFT JOIN destinations d ON d.id = l.destination_id
            LEFT JOIN staff_users su ON su.id = l.assigned_to
            LEFT JOIN customers c ON c.id = l.customer_id
            WHERE l.id = $1
        `, [id]);

        if (!result.rows.length) return res.status(404).json({ error: 'Lead not found' });

        const followUps = await db.query(`
            SELECT lf.*, su.full_name AS staff_name
            FROM lead_follow_ups lf
            JOIN staff_users su ON su.id = lf.staff_id
            WHERE lf.lead_id = $1
            ORDER BY lf.created_at DESC
        `, [id]);

        res.json({ ...result.rows[0], follow_ups: followUps.rows });
    } catch (err) { next(err); }
};

// ── Create lead ──────────────────────────────────────────────────
const createLead = async (req, res, next) => {
    try {
        const {
            full_name, email, phone, alternate_phone, source = 'manual',
            source_ref, destination_id, destination_text, travel_date_approx,
            pax_adults, pax_children, budget_approx, assigned_to, notes
        } = req.body;

        if (!full_name || !phone) {
            return res.status(400).json({ error: 'full_name and phone are required' });
        }

        // Dedup check
        const existing = await db.query(
            `SELECT id FROM leads WHERE phone = $1 AND status NOT IN ('converted','not_converted','junked')`,
            [phone]
        );
        if (existing.rows.length) {
            return res.status(409).json({ error: 'Active lead already exists for this phone', existing_id: existing.rows[0].id });
        }

        const result = await db.query(`
            INSERT INTO leads (full_name, email, phone, alternate_phone, source, source_ref,
                destination_id, destination_text, travel_date_approx, pax_adults, pax_children,
                budget_approx, assigned_to, notes)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
            RETURNING *
        `, [full_name, email, phone, alternate_phone, source, source_ref,
            destination_id, destination_text, travel_date_approx, pax_adults,
            pax_children, budget_approx, assigned_to || req.user.id, notes]);

        res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
};

// ── Bulk create (CSV) ────────────────────────────────────────────
const bulkCreateLeads = async (req, res, next) => {
    const client = await db.getClient();
    try {
        const { leads } = req.body;
        if (!Array.isArray(leads) || !leads.length) {
            return res.status(400).json({ error: 'leads array required' });
        }

        await client.query('BEGIN');
        let imported = 0, skipped = 0, errors = [];

        for (const lead of leads) {
            if (!lead.phone || !lead.full_name) { skipped++; continue; }
            const existing = await client.query(
                `SELECT id FROM leads WHERE phone = $1 AND status NOT IN ('converted','not_converted','junked')`,
                [lead.phone]
            );
            if (existing.rows.length) { skipped++; continue; }

            try {
                await client.query(`
                    INSERT INTO leads (full_name, email, phone, destination_text,
                        travel_date_approx, pax_adults, source, assigned_to)
                    VALUES ($1,$2,$3,$4,$5,$6,'csv_upload',$7)
                `, [lead.full_name, lead.email, lead.phone, lead.destination,
                    lead.travel_date, lead.adults, req.user.id]);
                imported++;
            } catch (e) { errors.push({ phone: lead.phone, error: e.message }); }
        }

        await client.query('COMMIT');
        res.json({ imported, skipped, errors });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally { client.release(); }
};

// ── Update lead status ───────────────────────────────────────────
const updateLeadStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, follow_up_at, notes } = req.body;

        const result = await db.query(`
            UPDATE leads SET status = $1, follow_up_at = $2, notes = COALESCE($3, notes)
            WHERE id = $4 RETURNING *
        `, [status, follow_up_at || null, notes, id]);

        if (!result.rows.length) return res.status(404).json({ error: 'Lead not found' });
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

// ── Assign lead ──────────────────────────────────────────────────
const assignLead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { assigned_to } = req.body;
        const result = await db.query(
            `UPDATE leads SET assigned_to = $1 WHERE id = $2 RETURNING *`,
            [assigned_to, id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Lead not found' });
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

// ── Log follow-up ────────────────────────────────────────────────
const logFollowUp = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { call_outcome, notes, status_set_to, next_follow_up } = req.body;

        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const fuResult = await client.query(`
                INSERT INTO lead_follow_ups (lead_id, staff_id, call_outcome, notes, status_set_to, next_follow_up)
                VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
            `, [id, req.user.id, call_outcome, notes, status_set_to, next_follow_up]);

            if (status_set_to || next_follow_up) {
                await client.query(`
                    UPDATE leads
                    SET status = COALESCE($1, status), follow_up_at = COALESCE($2, follow_up_at)
                    WHERE id = $3
                `, [status_set_to, next_follow_up, id]);
            }

            await client.query('COMMIT');
            res.status(201).json(fuResult.rows[0]);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally { client.release(); }
    } catch (err) { next(err); }
};

// ── Today's follow-up reminders ──────────────────────────────────
const getTodayReminders = async (req, res, next) => {
    try {
        const assignedTo = req.user.role === 'telecaller' ? req.user.id : req.query.staff_id;
        const params = [];
        let where = `WHERE l.follow_up_at <= NOW() + INTERVAL '1 day'
                     AND l.status NOT IN ('converted','not_converted','junked')`;
        if (assignedTo) {
            where += ` AND l.assigned_to = $1`;
            params.push(assignedTo);
        }
        const result = await db.query(`
            SELECT l.id, l.full_name, l.phone, l.status, l.follow_up_at,
                   l.destination_text, su.full_name AS assigned_to_name
            FROM leads l
            LEFT JOIN staff_users su ON su.id = l.assigned_to
            ${where}
            ORDER BY l.follow_up_at ASC
            LIMIT 100
        `, params);
        res.json(result.rows);
    } catch (err) { next(err); }
};

// ── Webhook (website form) ───────────────────────────────────────
const webhookCreateLead = async (req, res, next) => {
    try {
        const secret = req.headers['x-webhook-secret'];
        if (secret !== process.env.WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Invalid webhook secret' });
        }
        req.body.source = 'website_form';
        await createLead(req, res, next);
    } catch (err) { next(err); }
};

module.exports = {
    getLeads, getLead, createLead, bulkCreateLeads,
    updateLeadStatus, assignLead, logFollowUp,
    getTodayReminders, webhookCreateLead
};
