// src/controllers/admin.controller.js
const db = require('../config/db');

// ── DESTINATIONS ─────────────────────────────────────────────────
const listDestinations = async (req, res, next) => {
    try {
        const { q, page = 1, limit = 50 } = req.query;
        const where = ['company_id = ?'];
        const params = [req.companyId];
        if (q) { where.push('(name LIKE ? OR state LIKE ? OR country LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;
        const [rows] = await db.query(
            `SELECT * FROM destinations ${whereSql} ORDER BY is_active DESC, name LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(`SELECT COUNT(*) AS total FROM destinations ${whereSql}`, params);
        res.json({ items: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const createDestination = async (req, res, next) => {
    try {
        const { name, state, country = 'India', is_active = 1 } = req.body || {};
        if (!name) return res.status(400).json({ error: 'name is required' });
        const [r] = await db.query(
            'INSERT INTO destinations (name, state, country, is_active, company_id) VALUES (?,?,?,?,?)',
            [name, state || null, country, is_active ? 1 : 0, req.companyId]
        );
        const [rows] = await db.query('SELECT * FROM destinations WHERE id = ? AND company_id = ?', [r.insertId, req.companyId]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
};

const updateDestination = async (req, res, next) => {
    try {
        const { name, state, country, is_active } = req.body || {};
        const fields = [];
        const params = [];
        if (name !== undefined)       { fields.push('name = ?');       params.push(name); }
        if (state !== undefined)      { fields.push('state = ?');      params.push(state); }
        if (country !== undefined)    { fields.push('country = ?');    params.push(country); }
        if (is_active !== undefined)  { fields.push('is_active = ?');  params.push(is_active ? 1 : 0); }
        if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(req.params.id, req.companyId);
        const [r] = await db.query(`UPDATE destinations SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, params);
        if (!r.affectedRows) return res.status(404).json({ error: 'Destination not found' });
        const [rows] = await db.query('SELECT * FROM destinations WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

// ── HOTEL RATES ──────────────────────────────────────────────────
const listHotelRates = async (req, res, next) => {
    try {
        const { destination_id, q, page = 1, limit = 50 } = req.query;
        const where = ['hr.company_id = ?'];
        const params = [req.companyId];
        if (destination_id) { where.push('hr.destination_id = ?'); params.push(destination_id); }
        if (q) { where.push('(hr.hotel_name LIKE ? OR d.name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;
        const [rows] = await db.query(
            `SELECT hr.*, d.name AS destination_name
             FROM hotel_rates hr
             JOIN destinations d ON d.id = hr.destination_id AND d.company_id = hr.company_id
             ${whereSql}
             ORDER BY d.name, hr.star_rating, hr.room_type
             LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM hotel_rates hr JOIN destinations d ON d.id = hr.destination_id AND d.company_id = hr.company_id ${whereSql}`, params
        );
        res.json({ items: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const createHotelRate = async (req, res, next) => {
    try {
        const {
            destination_id, hotel_name, star_rating, room_type,
            meal_plan = 'none', charge_per_night,
            is_active = 1, valid_from, valid_till, notes
        } = req.body || {};
        if (!destination_id || !hotel_name || !star_rating || !room_type || charge_per_night == null) {
            return res.status(400).json({ error: 'destination_id, hotel_name, star_rating, room_type, charge_per_night are required' });
        }
        const [r] = await db.query(
            `INSERT INTO hotel_rates
                (destination_id, hotel_name, star_rating, room_type, meal_plan,
                 charge_per_night, is_active, valid_from, valid_till, notes, created_by, company_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [destination_id, hotel_name, star_rating, room_type, meal_plan,
             charge_per_night, is_active ? 1 : 0, valid_from || null, valid_till || null,
             notes || null, req.user.id, req.companyId]
        );
        const [rows] = await db.query('SELECT * FROM hotel_rates WHERE id = ? AND company_id = ?', [r.insertId, req.companyId]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
};

const updateHotelRate = async (req, res, next) => {
    try {
        const allowed = ['hotel_name','star_rating','room_type','meal_plan','charge_per_night',
                         'is_active','valid_from','valid_till','notes'];
        const fields = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                fields.push(`${k} = ?`);
                params.push(k === 'is_active' ? (req.body[k] ? 1 : 0) : req.body[k]);
            }
        }
        if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(req.params.id, req.companyId);
        const [r] = await db.query(`UPDATE hotel_rates SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, params);
        if (!r.affectedRows) return res.status(404).json({ error: 'Hotel rate not found' });
        const [rows] = await db.query('SELECT * FROM hotel_rates WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const deleteHotelRate = async (req, res, next) => {
    try {
        const [r] = await db.query('DELETE FROM hotel_rates WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        if (!r.affectedRows) return res.status(404).json({ error: 'Hotel rate not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

// ── CAR TYPES ────────────────────────────────────────────────────
const listCarTypes = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM car_types WHERE company_id = ? ORDER BY is_active DESC, name', [req.companyId]);
        res.json(rows);
    } catch (err) { next(err); }
};

// ── CAR RATES ────────────────────────────────────────────────────
const listCarRates = async (req, res, next) => {
    try {
        const { destination_id, q, page = 1, limit = 50 } = req.query;
        const where = ['cr.company_id = ?'];
        const params = [req.companyId];
        if (destination_id) { where.push('cr.destination_id = ?'); params.push(destination_id); }
        if (q) { where.push('(ct.name LIKE ? OR d.name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;
        const [rows] = await db.query(
            `SELECT cr.*, ct.name AS car_type_name, ct.capacity, d.name AS destination_name
             FROM car_rates cr
             JOIN car_types ct ON ct.id = cr.car_type_id AND ct.company_id = cr.company_id
             JOIN destinations d ON d.id = cr.destination_id AND d.company_id = cr.company_id
             ${whereSql}
             ORDER BY d.name, cr.car_class, ct.name
             LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM car_rates cr JOIN destinations d ON d.id = cr.destination_id AND d.company_id = cr.company_id ${whereSql}`, params
        );
        res.json({ items: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const createCarRate = async (req, res, next) => {
    try {
        const {
            destination_id, car_type_id, car_class = 'standard',
            charge_per_day, km_limit_per_day = 250, extra_charge_per_km = 12,
            is_active = 1, valid_from, valid_till, notes
        } = req.body || {};
        if (!destination_id || !car_type_id || charge_per_day == null) {
            return res.status(400).json({ error: 'destination_id, car_type_id, charge_per_day are required' });
        }
        const [r] = await db.query(
            `INSERT INTO car_rates
                (destination_id, car_type_id, car_class, charge_per_day,
                 km_limit_per_day, extra_charge_per_km, is_active, valid_from, valid_till, notes, created_by, company_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [destination_id, car_type_id, car_class, charge_per_day,
             km_limit_per_day, extra_charge_per_km, is_active ? 1 : 0,
             valid_from || null, valid_till || null, notes || null, req.user.id, req.companyId]
        );
        const [rows] = await db.query('SELECT * FROM car_rates WHERE id = ? AND company_id = ?', [r.insertId, req.companyId]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
};

const updateCarRate = async (req, res, next) => {
    try {
        const allowed = ['car_class','charge_per_day','km_limit_per_day','extra_charge_per_km',
                         'is_active','valid_from','valid_till','notes'];
        const fields = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                fields.push(`${k} = ?`);
                params.push(k === 'is_active' ? (req.body[k] ? 1 : 0) : req.body[k]);
            }
        }
        if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(req.params.id, req.companyId);
        const [r] = await db.query(`UPDATE car_rates SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, params);
        if (!r.affectedRows) return res.status(404).json({ error: 'Car rate not found' });
        const [rows] = await db.query('SELECT * FROM car_rates WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const deleteCarRate = async (req, res, next) => {
    try {
        const [r] = await db.query('DELETE FROM car_rates WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        if (!r.affectedRows) return res.status(404).json({ error: 'Car rate not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

// ── AGENCY SETTINGS ──────────────────────────────────────────────
const getSettings = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM agency_settings WHERE company_id = ? ORDER BY id LIMIT 1', [req.companyId]);
        res.json(rows[0] || {});
    } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
    try {
        const allowed = ['agency_name','address','phone','email','website','gstin','logo_url',
                         'default_booking_fee_pct','default_markup_pct','default_gst_pct',
                         'default_quotation_valid_days','invoice_prefix','invoice_counter',
                         'bank_name','bank_account_no','bank_ifsc','bank_branch',
                         'cashfree_app_id','cashfree_secret_key','cashfree_webhook_secret','cashfree_env'];
        const fields = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) { fields.push(`${k} = ?`); params.push(req.body[k]); }
        }
        if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

        const [existing] = await db.query('SELECT id FROM agency_settings WHERE company_id = ? LIMIT 1', [req.companyId]);
        if (existing[0]) {
            params.push(existing[0].id);
            await db.query(`UPDATE agency_settings SET ${fields.join(', ')} WHERE id = ?`, params);
        } else {
            await db.query(`INSERT INTO agency_settings SET ${fields.join(', ')}, company_id = ?`, [...params, req.companyId]);
        }
        const [rows] = await db.query('SELECT * FROM agency_settings WHERE company_id = ? ORDER BY id LIMIT 1', [req.companyId]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

// ── B2B AGENT MANAGEMENT ──────────────────────────────────────────
const listAgents = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query || {};
        const params = [req.companyId];
        let query = 'SELECT id, agency_name, agent_name, email, phone, commission_type, commission_rate, status, created_at, updated_at FROM agents WHERE company_id = ?';
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;
        params.push(lim, offset);

        const [rows] = await db.query(query, params);

        // Get count
        let countQuery = 'SELECT COUNT(*) as total FROM agents WHERE company_id = ?';
        const countParams = [req.companyId];
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        const [[{ total }]] = await db.query(countQuery, countParams);

        res.json({ items: rows, total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const updateAgentStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, commission_type, commission_rate } = req.body || {};
        const allowed = ['status', 'commission_type', 'commission_rate'];
        const fields = [];
        const params = [];
        
        if (status !== undefined) {
            fields.push('status = ?');
            params.push(status);
        }
        if (commission_type !== undefined) {
            fields.push('commission_type = ?');
            params.push(commission_type);
        }
        if (commission_rate !== undefined) {
            fields.push('commission_rate = ?');
            params.push(Number(commission_rate));
        }

        if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(id, req.companyId);

        const [r] = await db.query(`UPDATE agents SET ${fields.join(', ')} WHERE id = ? AND company_id = ?`, params);
        if (!r.affectedRows) return res.status(404).json({ error: 'Agent not found' });

        const [rows] = await db.query('SELECT id, agency_name, agent_name, email, phone, commission_type, commission_rate, status, created_at, updated_at FROM agents WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

// ── COMMISSION MANAGEMENT ─────────────────────────────────────────
const listCommissions = async (req, res, next) => {
    try {
        const { status, agent_id, page = 1, limit = 20 } = req.query || {};
        const params = [req.companyId];
        let query = `
            SELECT c.*, b.booking_number, b.total_amount, b.customer_name as client_name,
                   a.agency_name, a.agent_name,
                   rb.booking_number AS referrer_booking_number
            FROM commissions c
            JOIN bookings b ON b.id = c.booking_id
            LEFT JOIN agents a ON a.id = c.agent_id
            LEFT JOIN bookings rb ON rb.id = c.referrer_booking_id
            WHERE c.company_id = ?
        `;
        if (status) {
            query += ' AND c.status = ?';
            params.push(status);
        }
        if (agent_id) {
            query += ' AND c.agent_id = ?';
            params.push(agent_id);
        }
        query += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;
        params.push(lim, offset);

        const [rows] = await db.query(query, params);

        // Get count
        let countQuery = 'SELECT COUNT(*) as total FROM commissions c WHERE c.company_id = ?';
        const countParams = [req.companyId];
        if (status) {
            countQuery += ' AND c.status = ?';
            countParams.push(status);
        }
        if (agent_id) {
            countQuery += ' AND c.agent_id = ?';
            countParams.push(agent_id);
        }
        const [[{ total }]] = await db.query(countQuery, countParams);

        res.json({ items: rows, total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const payCommission = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { payment_reference, notes } = req.body || {};
        if (!payment_reference) {
            return res.status(400).json({ error: 'payment_reference is required' });
        }

        const [r] = await db.query(
            `UPDATE commissions
             SET status = 'paid', payment_reference = ?, paid_at = NOW(), notes = COALESCE(?, notes)
             WHERE id = ? AND company_id = ?`,
            [payment_reference, notes || null, id, req.companyId]
        );

        if (!r.affectedRows) {
            return res.status(404).json({ error: 'Commission record not found or not belonging to your company' });
        }

        const [rows] = await db.query('SELECT * FROM commissions WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

module.exports = {
    listDestinations, createDestination, updateDestination,
    listHotelRates, createHotelRate, updateHotelRate, deleteHotelRate,
    listCarTypes,
    listCarRates, createCarRate, updateCarRate, deleteCarRate,
    getSettings, updateSettings,
    listAgents, updateAgentStatus, listCommissions, payCommission
};
