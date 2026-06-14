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

module.exports = {
    listDestinations, createDestination, updateDestination,
    listHotelRates, createHotelRate, updateHotelRate, deleteHotelRate,
    listCarTypes,
    listCarRates, createCarRate, updateCarRate, deleteCarRate,
    getSettings, updateSettings
};
