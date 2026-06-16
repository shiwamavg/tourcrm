// src/controllers/quotations.controller.js
const db = require('../config/db');

// ── Generate quotation number: QUO-YYYY-NNNN ───────────────────────
const generateQuotationNumber = async (conn, companyId) => {
    const year = new Date().getFullYear();
    const [rows] = await conn.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number, 10) AS UNSIGNED)), 0) + 1 AS next
           FROM quotations WHERE quotation_number LIKE ?`,
        [`QUO-${year}-%`]
    );
    const seq = String(rows[0].next).padStart(4, '0');
    return `QUO-${year}-${seq}`;
};

// ── Recalculate totals from line items ────────────────────────────
const recalcTotals = async (conn, quotationId, companyId) => {
    const [hotels] = await conn.query(
        'SELECT COALESCE(SUM(line_total),0) AS t FROM quotation_hotels WHERE quotation_id = ? AND company_id = ?',
        [quotationId, companyId]
    );
    const [cars] = await conn.query(
        'SELECT COALESCE(SUM(line_total),0) AS t FROM quotation_cars WHERE quotation_id = ? AND company_id = ?',
        [quotationId, companyId]
    );
    const [flights] = await conn.query(
        'SELECT COALESCE(SUM(line_total),0) AS t FROM quotation_flights WHERE quotation_id = ? AND company_id = ?',
        [quotationId, companyId]
    );
    const [misc] = await conn.query(
        'SELECT COALESCE(SUM(amount),0) AS t FROM quotation_misc WHERE quotation_id = ? AND company_id = ?',
        [quotationId, companyId]
    );

    const hotelTotal  = Number(hotels[0].t);
    const carTotal    = Number(cars[0].t);
    const flightTotal = Number(flights[0].t);
    const miscTotal   = Number(misc[0].t);
    const subtotal    = hotelTotal + carTotal + flightTotal + miscTotal;

    const [q] = await conn.query('SELECT markup_pct, gst_pct FROM quotations WHERE id = ? AND company_id = ?', [quotationId, companyId]);
    const markupPct    = Number(q[0]?.markup_pct || 0);
    const gstPct       = Number(q[0]?.gst_pct || 0);
    const markupAmount = subtotal * markupPct / 100;
    const gstBase      = subtotal + markupAmount;
    const gstAmount    = gstBase * gstPct / 100;
    const grandTotal   = gstBase + gstAmount;

    await conn.query(
        `UPDATE quotations SET
            hotel_total=?, car_total=?, flight_total=?, misc_total=?,
            subtotal=?, markup_amount=?, gst_amount=?, grand_total=?
         WHERE id=? AND company_id=?`,
        [hotelTotal, carTotal, flightTotal, miscTotal,
         subtotal, markupAmount, gstAmount, grandTotal, quotationId, companyId]
    );
};

// ── Helpers to insert child rows ─────────────────────────────────
const insertHotels = async (conn, qId, companyId, hotels = []) => {
    for (let i = 0; i < hotels.length; i++) {
        const h = hotels[i];
        await conn.query(
            `INSERT INTO quotation_hotels
                (quotation_id, company_id, hotel_rate_id, hotel_name, star_rating, room_type,
                 meal_plan, charge_per_night, num_nights, num_rooms, special_charges,
                 special_charges_note, sort_order)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [qId, companyId, h.hotel_rate_id || null, h.hotel_name, h.star_rating || null,
             h.room_type, h.meal_plan || 'none', h.charge_per_night, h.num_nights,
             h.num_rooms || 1, h.special_charges || 0, h.special_charges_note || null, i]
        );
    }
};

const insertCars = async (conn, qId, companyId, cars = []) => {
    for (let i = 0; i < cars.length; i++) {
        const c = cars[i];
        await conn.query(
            `INSERT INTO quotation_cars
                (quotation_id, company_id, car_rate_id, car_type_name, car_class, charge_per_day,
                 num_days, km_limit_per_day, extra_charge_per_km, estimated_extra_km, sort_order)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [qId, companyId, c.car_rate_id || null, c.car_type_name, c.car_class || 'standard',
             c.charge_per_day, c.num_days, c.km_limit_per_day || 250,
             c.extra_charge_per_km || 0, c.estimated_extra_km || 0, i]
        );
    }
};

const insertFlights = async (conn, qId, companyId, flights = [], adults = 1, children = 0) => {
    for (let i = 0; i < flights.length; i++) {
        const f = flights[i];
        await conn.query(
            `INSERT INTO quotation_flights
                (quotation_id, company_id, airline, route, flight_date, fare_per_adult,
                 fare_per_child, num_adults, num_children, sort_order)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [qId, companyId, f.airline || null, f.route || null, f.flight_date || null,
             f.fare_per_adult || 0, f.fare_per_child || 0,
             f.num_adults || adults, f.num_children || children, i]
        );
    }
};

const insertMisc = async (conn, qId, companyId, misc = []) => {
    for (let i = 0; i < misc.length; i++) {
        const m = misc[i];
        await conn.query(
            'INSERT INTO quotation_misc (quotation_id, company_id, label, amount, sort_order) VALUES (?,?,?,?,?)',
            [qId, companyId, m.label, m.amount || 0, i]
        );
    }
};

const insertDaywise = async (conn, qId, companyId, days = []) => {
    for (let i = 0; i < days.length; i++) {
        const d = days[i];
        await conn.query(
            `INSERT INTO daywise_itinenary
                (quote_id, company_id, itenary_name, hotel_name, date, day, day_name,
                 vehicle_type, lead_id, amt, details)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [qId, companyId, d.itenary_name || '', d.hotel_name || null,
             d.date || new Date().toISOString().split('T')[0], d.day || (i + 1), d.day_name || '',
             d.vehicle_type || '', d.lead_id || 0, Number(d.amt) || 0, d.details || '']
        );
    }
};

// ── Create quotation with all line items (transaction) ───────────
const createQuotation = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const {
            lead_id, customer_name, customer_email, customer_phone,
            destination_id, destination_text, package_id,
            trip_start_date, trip_end_date, adults = 1,
            children_below_5 = 0, children_above_5 = 0, num_rooms = 1, package_type,
            markup_pct = 10, gst_pct = 5, valid_till, terms_notes, internal_notes,
            hotels = [], cars = [], flights = [], misc = [], daywise_itinerary = []
        } = req.body || {};

        if (!customer_name || !customer_phone) {
            await conn.rollback();
            return res.status(400).json({ error: 'customer_name and customer_phone are required' });
        }
        if (!trip_start_date || !trip_end_date) {
            await conn.rollback();
            return res.status(400).json({ error: 'trip_start_date and trip_end_date are required' });
        }
        if (!package_type) {
            await conn.rollback();
            return res.status(400).json({ error: 'package_type is required' });
        }

        const quotationNumber = await generateQuotationNumber(conn, req.companyId);

        const [qResult] = await conn.query(
            `INSERT INTO quotations
                (quotation_number, lead_id, customer_name, customer_email, customer_phone, created_by,
                 destination_id, destination_text, package_id, trip_start_date, trip_end_date,
                 adults, children_below_5, children_above_5, num_rooms, package_type,
                 markup_pct, gst_pct, valid_till, terms_notes, internal_notes, status, company_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [quotationNumber, lead_id || null, customer_name, customer_email || null, customer_phone,
             req.user.id, destination_id || null, destination_text || null, package_id || null,
             trip_start_date, trip_end_date, adults, children_below_5, children_above_5, num_rooms,
             package_type, markup_pct, gst_pct, valid_till || null,
             terms_notes || null, internal_notes || null, 'draft', req.companyId]
        );
        const qId = qResult.insertId;

        await insertHotels(conn, qId, req.companyId, hotels);
        await insertCars(conn, qId, req.companyId, cars);
        await insertFlights(conn, qId, req.companyId, flights, adults, children_above_5);
        await insertMisc(conn, qId, req.companyId, misc);
        await insertDaywise(conn, qId, req.companyId, daywise_itinerary);

        await recalcTotals(conn, qId, req.companyId);
        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(conn, {
                company_id: req.companyId,
                lead_id: lead_id || null,
                quotation_id: qId,
                user_id: req.user.id,
                notes: `Quotation ${quotationNumber} created. Status: draft.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for quotation creation:', e.message);
        }
        await conn.commit();

        const full = await getQuotationById(qId, req.companyId);
        res.status(201).json(full);
    } catch (err) {
        try { await conn.rollback(); } catch {}
        next(err);
    } finally {
        conn.release();
    }
};

// ── Update quotation (delete+reinsert line items, transaction) ───
const updateQuotation = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { id } = req.params;
        const {
            customer_name, customer_email, customer_phone,
            destination_id, destination_text, package_id,
            trip_start_date, trip_end_date, adults = 1,
            children_below_5 = 0, children_above_5 = 0, num_rooms = 1, package_type,
            markup_pct = 10, gst_pct = 5, valid_till, terms_notes, internal_notes,
            hotels = [], cars = [], flights = [], misc = [], daywise_itinerary = []
        } = req.body || {};

        // Verify ownership
        const [[existing]] = await conn.query(
            'SELECT id, status, quotation_number, lead_id FROM quotations WHERE id = ? AND company_id = ?',
            [id, req.companyId]
        );
        if (!existing) {
            await conn.rollback();
            return res.status(404).json({ error: 'Quotation not found' });
        }

        await conn.query(
            `UPDATE quotations SET
                customer_name=?, customer_email=?, customer_phone=?,
                destination_id=?, destination_text=?, package_id=?,
                trip_start_date=?, trip_end_date=?,
                adults=?, children_below_5=?, children_above_5=?, num_rooms=?, package_type=?,
                markup_pct=?, gst_pct=?, valid_till=?, terms_notes=?, internal_notes=?
              WHERE id=? AND company_id=?`,
            [customer_name, customer_email || null, customer_phone,
             destination_id || null, destination_text || null, package_id || null,
             trip_start_date, trip_end_date,
             adults, children_below_5, children_above_5, num_rooms, package_type,
             markup_pct, gst_pct, valid_till || null, terms_notes || null, internal_notes || null,
             id, req.companyId]
        );

        // Delete old line items and re-insert
        await conn.query('DELETE FROM quotation_hotels  WHERE quotation_id=? AND company_id=?', [id, req.companyId]);
        await conn.query('DELETE FROM quotation_cars    WHERE quotation_id=? AND company_id=?', [id, req.companyId]);
        await conn.query('DELETE FROM quotation_flights WHERE quotation_id=? AND company_id=?', [id, req.companyId]);
        await conn.query('DELETE FROM quotation_misc    WHERE quotation_id=? AND company_id=?', [id, req.companyId]);
        await conn.query('DELETE FROM daywise_itinenary WHERE quote_id=? AND company_id=?', [id, req.companyId]);

        await insertHotels(conn, id, req.companyId, hotels);
        await insertCars(conn, id, req.companyId, cars);
        await insertFlights(conn, id, req.companyId, flights, adults, children_above_5);
        await insertMisc(conn, id, req.companyId, misc);
        await insertDaywise(conn, id, req.companyId, daywise_itinerary);

        await recalcTotals(conn, id, req.companyId);
        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(conn, {
                company_id: req.companyId,
                lead_id: existing.lead_id || null,
                quotation_id: id,
                user_id: req.user.id,
                notes: `Quotation ${existing.quotation_number} edited/updated.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for quotation update:', e.message);
        }
        await conn.commit();

        const full = await getQuotationById(id, req.companyId);
        res.json(full);
    } catch (err) {
        try { await conn.rollback(); } catch {}
        next(err);
    } finally {
        conn.release();
    }
};

// ── Get full quotation with all line items ───────────────────────
const getQuotationById = async (id, companyId) => {
    const [q] = await db.query(
        `SELECT q.*, d.name AS destination_name, su.full_name AS created_by_name,
                p.title AS package_title
         FROM quotations q
         LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = q.company_id
         LEFT JOIN staff_users su ON su.id = q.created_by AND su.company_id = q.company_id
         LEFT JOIN packages p ON p.id = q.package_id AND p.company_id = q.company_id
         WHERE q.id = ? AND q.company_id = ?`, [id, companyId]
    );
    if (!q[0]) return null;
    const id_ = id;
    const cid = companyId;
    const [hotels, cars, flights, misc] = await Promise.all([
        db.query('SELECT * FROM quotation_hotels WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [id_, cid]),
        db.query('SELECT * FROM quotation_cars WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [id_, cid]),
        db.query('SELECT * FROM quotation_flights WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [id_, cid]),
        db.query('SELECT * FROM quotation_misc WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [id_, cid])
    ]);
    return {
        ...q[0],
        hotels: hotels[0],
        cars: cars[0],
        flights: flights[0],
        misc: misc[0]
    };
};

const getQuotation = async (req, res, next) => {
    try {
        const q = await getQuotationById(req.params.id, req.companyId);
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        res.json(q);
    } catch (err) { next(err); }
};

// ── List quotations with filters ─────────────────────────────────
const listQuotations = async (req, res, next) => {
    try {
        const { status, q: search, page = 1, limit = 20 } = req.query;
        const where = ['q.company_id = ?'];
        const params = [req.companyId];
        if (status) { where.push('q.status = ?'); params.push(status); }
        if (search) {
            where.push('(q.quotation_number LIKE ? OR q.customer_name LIKE ? OR q.customer_phone LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like, like);
        }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT q.id, q.quotation_number, q.status, q.trip_start_date, q.trip_end_date,
                    q.grand_total, q.adults, q.package_type, q.created_at,
                    q.customer_name, q.customer_phone, q.destination_text, q.package_id,
                    d.name AS destination_name, su.full_name AS created_by_name,
                    p.title AS package_title
              FROM quotations q
              LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = q.company_id
              LEFT JOIN staff_users su ON su.id = q.created_by AND su.company_id = q.company_id
              LEFT JOIN packages p ON p.id = q.package_id AND p.company_id = q.company_id
             ${whereSql}
             ORDER BY q.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [countRow] = await db.query(
            `SELECT COUNT(*) AS total FROM quotations q ${whereSql}`, params
        );
        res.json({ items: rows, total: countRow[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};



// ── Update quotation status ─────────────────────────────────────
const updateQuotationStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};
        const allowed = ['draft', 'sent', 'accepted', 'rejected', 'expired', 'superseded'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: `status must be one of ${allowed.join(', ')}` });
        }

        // Fetch current status and lead_id for timeline logging
        const [[original]] = await db.query(
            'SELECT status, quotation_number, lead_id FROM quotations WHERE id = ? AND company_id = ?',
            [id, req.companyId]
        );
        if (!original) return res.status(404).json({ error: 'Quotation not found' });

        const tsField = { sent: 'sent_at', accepted: 'accepted_at', rejected: 'rejected_at' }[status];
        const sql = tsField
            ? 'UPDATE quotations SET status = ?, version = version + 1, ' + tsField + ' = NOW() WHERE id = ? AND company_id = ?'
            : 'UPDATE quotations SET status = ? WHERE id = ? AND company_id = ?';
        const [result] = await db.query(sql, [status, id, req.companyId]);
        if (!result.affectedRows) return res.status(404).json({ error: 'Quotation not found' });

        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: req.companyId,
                lead_id: original.lead_id || null,
                quotation_id: id,
                user_id: req.user.id,
                notes: `Quotation ${original.quotation_number} status updated from "${original.status}" to "${status}".`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for quotation status update:', e.message);
        }

        const updated = await getQuotationById(id, req.companyId);
        res.json(updated);
    } catch (err) { next(err); }
};

// ── Master rates for builder (filtered by destination) ──────────
const getHotelRatesForDestination = async (req, res, next) => {
    try {
        const { destination_id } = req.query;
        if (!destination_id) return res.status(400).json({ error: 'destination_id is required' });
        const [rows] = await db.query(
            `SELECT * FROM hotel_rates WHERE destination_id = ? AND company_id = ? AND is_active = 1
             ORDER BY star_rating, room_type`,
            [destination_id, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const getCarRatesForDestination = async (req, res, next) => {
    try {
        const { destination_id } = req.query;
        if (!destination_id) return res.status(400).json({ error: 'destination_id is required' });
        const [rows] = await db.query(
            `SELECT cr.*, ct.name AS car_type_name, ct.capacity
             FROM car_rates cr
             JOIN car_types ct ON ct.id = cr.car_type_id AND ct.company_id = cr.company_id
             WHERE cr.destination_id = ? AND cr.company_id = ? AND cr.is_active = 1
             ORDER BY cr.car_class, ct.name`,
            [destination_id, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

// ── Dashboard stats ──────────────────────────────────────────────
const getStats = async (req, res, next) => {
    try {
        const [[counts]] = await db.query(
            `SELECT
                COUNT(*) AS total,
                SUM(status='draft')   AS drafts,
                SUM(status='sent')    AS sent,
                SUM(status='accepted') AS accepted,
                SUM(status='rejected') AS rejected
             FROM quotations WHERE company_id = ?`,
            [req.companyId]
        );
        const [[sums]] = await db.query(
            `SELECT COALESCE(SUM(grand_total),0) AS total_value FROM quotations WHERE company_id = ?`,
            [req.companyId]
        );
        res.json({
            total: Number(counts.total || 0),
            drafts: Number(counts.drafts || 0),
            sent: Number(counts.sent || 0),
            accepted: Number(counts.accepted || 0),
            rejected: Number(counts.rejected || 0),
            total_value: Number(sums.total_value || 0)
        });
    } catch (err) { next(err); }
};

module.exports = {
    createQuotation, updateQuotation, getQuotation, listQuotations,
    updateQuotationStatus,
    getHotelRatesForDestination, getCarRatesForDestination,
    getStats
};
