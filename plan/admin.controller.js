const db = require('../config/db');
const bcrypt = require('bcryptjs');

// ── Destinations ──────────────────────────────────────────────────
const getDestinations = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT * FROM destinations WHERE is_active = true ORDER BY name`
        );
        res.json(result.rows);
    } catch (err) { next(err); }
};

const createDestination = async (req, res, next) => {
    try {
        const { name, state, country = 'India' } = req.body;
        const result = await db.query(
            `INSERT INTO destinations (name, state, country) VALUES ($1,$2,$3) RETURNING *`,
            [name, state, country]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
};

const updateDestination = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, state, country, is_active } = req.body;
        const result = await db.query(
            `UPDATE destinations SET name=COALESCE($1,name), state=COALESCE($2,state),
             country=COALESCE($3,country), is_active=COALESCE($4,is_active) WHERE id=$5 RETURNING *`,
            [name, state, country, is_active, id]
        );
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

// ── Hotel Rates ───────────────────────────────────────────────────
const getHotelRates = async (req, res, next) => {
    try {
        const { destination_id } = req.query;
        const params = [];
        let where = 'WHERE hr.is_active = true';
        if (destination_id) { where += ` AND hr.destination_id = $1`; params.push(destination_id); }

        const result = await db.query(`
            SELECT hr.*, d.name AS destination_name
            FROM hotel_rates hr
            JOIN destinations d ON d.id = hr.destination_id
            ${where}
            ORDER BY d.name, hr.star_rating, hr.room_type
        `, params);
        res.json(result.rows);
    } catch (err) { next(err); }
};

const createHotelRate = async (req, res, next) => {
    try {
        const {
            destination_id, hotel_name, star_rating, room_type, meal_plan = 'none',
            charge_per_night, valid_from, valid_till, notes
        } = req.body;
        const result = await db.query(`
            INSERT INTO hotel_rates (destination_id, hotel_name, star_rating, room_type,
                meal_plan, charge_per_night, valid_from, valid_till, notes, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        `, [destination_id, hotel_name, star_rating, room_type, meal_plan,
            charge_per_night, valid_from, valid_till, notes, req.user.id]);
        res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
};

const updateHotelRate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { hotel_name, star_rating, room_type, meal_plan, charge_per_night, is_active, notes } = req.body;
        const result = await db.query(`
            UPDATE hotel_rates SET
                hotel_name=COALESCE($1,hotel_name), star_rating=COALESCE($2,star_rating),
                room_type=COALESCE($3,room_type), meal_plan=COALESCE($4,meal_plan),
                charge_per_night=COALESCE($5,charge_per_night),
                is_active=COALESCE($6,is_active), notes=COALESCE($7,notes)
            WHERE id=$8 RETURNING *
        `, [hotel_name, star_rating, room_type, meal_plan, charge_per_night, is_active, notes, id]);
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

// ── Car Rates ─────────────────────────────────────────────────────
const getCarRates = async (req, res, next) => {
    try {
        const { destination_id } = req.query;
        const params = [];
        let where = 'WHERE cr.is_active = true';
        if (destination_id) { where += ` AND cr.destination_id = $1`; params.push(destination_id); }

        const result = await db.query(`
            SELECT cr.*, ct.name AS car_type_name, ct.capacity, d.name AS destination_name
            FROM car_rates cr
            JOIN car_types ct ON ct.id = cr.car_type_id
            JOIN destinations d ON d.id = cr.destination_id
            ${where}
            ORDER BY d.name, ct.name, cr.car_class
        `, params);
        res.json(result.rows);
    } catch (err) { next(err); }
};

const createCarRate = async (req, res, next) => {
    try {
        const {
            destination_id, car_type_id, car_class = 'standard', charge_per_day,
            km_limit_per_day = 250, extra_charge_per_km = 12, valid_from, valid_till, notes
        } = req.body;
        const result = await db.query(`
            INSERT INTO car_rates (destination_id, car_type_id, car_class, charge_per_day,
                km_limit_per_day, extra_charge_per_km, valid_from, valid_till, notes, created_by)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
        `, [destination_id, car_type_id, car_class, charge_per_day,
            km_limit_per_day, extra_charge_per_km, valid_from, valid_till, notes, req.user.id]);
        res.status(201).json(result.rows[0]);
    } catch (err) { next(err); }
};

const updateCarRate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { charge_per_day, km_limit_per_day, extra_charge_per_km, is_active, notes } = req.body;
        const result = await db.query(`
            UPDATE car_rates SET
                charge_per_day=COALESCE($1,charge_per_day),
                km_limit_per_day=COALESCE($2,km_limit_per_day),
                extra_charge_per_km=COALESCE($3,extra_charge_per_km),
                is_active=COALESCE($4,is_active), notes=COALESCE($5,notes)
            WHERE id=$6 RETURNING *
        `, [charge_per_day, km_limit_per_day, extra_charge_per_km, is_active, notes, id]);
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

// ── Car Types ─────────────────────────────────────────────────────
const getCarTypes = async (req, res, next) => {
    try {
        const result = await db.query(`SELECT * FROM car_types WHERE is_active = true ORDER BY name`);
        res.json(result.rows);
    } catch (err) { next(err); }
};

// ── Staff Users ───────────────────────────────────────────────────
const getStaffUsers = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, full_name, email, phone, role, is_active, last_login_at, created_at
             FROM staff_users ORDER BY full_name`
        );
        res.json(result.rows);
    } catch (err) { next(err); }
};

const createStaffUser = async (req, res, next) => {
    try {
        const { full_name, email, phone, role, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const result = await db.query(`
            INSERT INTO staff_users (full_name, email, phone, role, password_hash)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING id, full_name, email, role, phone, created_at
        `, [full_name, email, phone, role, hash]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
        next(err);
    }
};

// ── Agency Settings ───────────────────────────────────────────────
const getSettings = async (req, res, next) => {
    try {
        const result = await db.query(`SELECT * FROM agency_settings LIMIT 1`);
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

const updateSettings = async (req, res, next) => {
    try {
        const {
            agency_name, address, phone, email, website, gstin,
            default_booking_fee_pct, default_markup_pct, default_gst_pct,
            default_quotation_valid_days
        } = req.body;
        const result = await db.query(`
            UPDATE agency_settings SET
                agency_name=COALESCE($1,agency_name), address=COALESCE($2,address),
                phone=COALESCE($3,phone), email=COALESCE($4,email),
                website=COALESCE($5,website), gstin=COALESCE($6,gstin),
                default_booking_fee_pct=COALESCE($7,default_booking_fee_pct),
                default_markup_pct=COALESCE($8,default_markup_pct),
                default_gst_pct=COALESCE($9,default_gst_pct),
                default_quotation_valid_days=COALESCE($10,default_quotation_valid_days),
                updated_at=NOW()
            RETURNING *
        `, [agency_name, address, phone, email, website, gstin,
            default_booking_fee_pct, default_markup_pct, default_gst_pct,
            default_quotation_valid_days]);
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

module.exports = {
    getDestinations, createDestination, updateDestination,
    getHotelRates, createHotelRate, updateHotelRate,
    getCarRates, createCarRate, updateCarRate,
    getCarTypes, getStaffUsers, createStaffUser,
    getSettings, updateSettings
};
