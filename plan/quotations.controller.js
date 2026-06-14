const db = require('../config/db');

// ── Generate quotation number ─────────────────────────────────────
const generateQuotationNumber = async (client) => {
    const year = new Date().getFullYear();
    const result = await client.query(
        `SELECT COUNT(*) FROM quotations WHERE EXTRACT(YEAR FROM created_at) = $1`, [year]
    );
    const seq = String(parseInt(result.rows[0].count) + 1).padStart(4, '0');
    return `QUO-${year}-${seq}`;
};

// ── Recalculate totals from line items ────────────────────────────
const recalcTotals = async (client, quotationId) => {
    const [hotels, cars, flights, misc] = await Promise.all([
        client.query(`SELECT COALESCE(SUM(line_total),0) AS t FROM quotation_hotels WHERE quotation_id = $1`, [quotationId]),
        client.query(`SELECT COALESCE(SUM(line_total),0) AS t FROM quotation_cars WHERE quotation_id = $1`, [quotationId]),
        client.query(`SELECT COALESCE(SUM(line_total),0) AS t FROM quotation_flights WHERE quotation_id = $1`, [quotationId]),
        client.query(`SELECT COALESCE(SUM(amount),0) AS t FROM quotation_misc WHERE quotation_id = $1`, [quotationId])
    ]);

    const hotelTotal  = parseFloat(hotels.rows[0].t);
    const carTotal    = parseFloat(cars.rows[0].t);
    const flightTotal = parseFloat(flights.rows[0].t);
    const miscTotal   = parseFloat(misc.rows[0].t);
    const subtotal    = hotelTotal + carTotal + flightTotal + miscTotal;

    const q = await client.query(`SELECT markup_pct, gst_pct FROM quotations WHERE id = $1`, [quotationId]);
    const markupPct    = parseFloat(q.rows[0]?.markup_pct || 0);
    const gstPct       = parseFloat(q.rows[0]?.gst_pct || 0);
    const markupAmount = subtotal * markupPct / 100;
    const gstBase      = subtotal + markupAmount;
    const gstAmount    = gstBase * gstPct / 100;
    const grandTotal   = gstBase + gstAmount;

    await client.query(`
        UPDATE quotations SET
            hotel_total = $1, car_total = $2, flight_total = $3, misc_total = $4,
            subtotal = $5, markup_amount = $6, gst_amount = $7, grand_total = $8
        WHERE id = $9
    `, [hotelTotal, carTotal, flightTotal, miscTotal, subtotal, markupAmount, gstAmount, grandTotal, quotationId]);
};

// ── Create quotation ──────────────────────────────────────────────
const createQuotation = async (req, res, next) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const {
            lead_id, customer_id, destination_id, destination_text,
            trip_start_date, trip_end_date, adults, children_below_5 = 0,
            children_above_5 = 0, num_rooms = 1, package_type,
            markup_pct = 10, gst_pct = 5, valid_till, terms_notes,
            hotels = [], cars = [], flights = [], misc = []
        } = req.body;

        const quotationNumber = await generateQuotationNumber(client);

        const qResult = await client.query(`
            INSERT INTO quotations (
                quotation_number, lead_id, customer_id, created_by,
                destination_id, destination_text, trip_start_date, trip_end_date,
                adults, children_below_5, children_above_5, num_rooms, package_type,
                markup_pct, gst_pct, valid_till, terms_notes
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
            RETURNING id
        `, [quotationNumber, lead_id, customer_id, req.user.id,
            destination_id, destination_text, trip_start_date, trip_end_date,
            adults, children_below_5, children_above_5, num_rooms, package_type,
            markup_pct, gst_pct, valid_till, terms_notes]);

        const qId = qResult.rows[0].id;

        // Insert hotels
        for (let i = 0; i < hotels.length; i++) {
            const h = hotels[i];
            await client.query(`
                INSERT INTO quotation_hotels
                    (quotation_id, hotel_rate_id, hotel_name, star_rating, room_type,
                     meal_plan, charge_per_night, num_nights, num_rooms, special_charges,
                     special_charges_note, sort_order)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            `, [qId, h.hotel_rate_id, h.hotel_name, h.star_rating, h.room_type,
                h.meal_plan || 'none', h.charge_per_night, h.num_nights,
                h.num_rooms || 1, h.special_charges || 0, h.special_charges_note, i]);
        }

        // Insert cars
        for (let i = 0; i < cars.length; i++) {
            const c = cars[i];
            await client.query(`
                INSERT INTO quotation_cars
                    (quotation_id, car_rate_id, car_type_name, car_class, charge_per_day,
                     num_days, km_limit_per_day, extra_charge_per_km, estimated_extra_km, sort_order)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            `, [qId, c.car_rate_id, c.car_type_name, c.car_class || 'standard',
                c.charge_per_day, c.num_days, c.km_limit_per_day || 250,
                c.extra_charge_per_km || 0, c.estimated_extra_km || 0, i]);
        }

        // Insert flights
        for (let i = 0; i < flights.length; i++) {
            const f = flights[i];
            await client.query(`
                INSERT INTO quotation_flights
                    (quotation_id, airline, route, flight_date, fare_per_adult,
                     fare_per_child, num_adults, num_children, sort_order)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            `, [qId, f.airline, f.route, f.flight_date, f.fare_per_adult || 0,
                f.fare_per_child || 0, f.num_adults || adults, f.num_children || 0, i]);
        }

        // Insert misc
        for (let i = 0; i < misc.length; i++) {
            const m = misc[i];
            await client.query(`
                INSERT INTO quotation_misc (quotation_id, label, amount, sort_order)
                VALUES ($1,$2,$3,$4)
            `, [qId, m.label, m.amount || 0, i]);
        }

        await recalcTotals(client, qId);
        await client.query('COMMIT');

        const full = await getQuotationById(qId);
        res.status(201).json(full);
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally { client.release(); }
};

// ── Get full quotation with line items ────────────────────────────
const getQuotationById = async (id) => {
    const [q, hotels, cars, flights, misc] = await Promise.all([
        db.query(`
            SELECT q.*, d.name AS destination_name,
                   su.full_name AS created_by_name,
                   l.full_name AS lead_name, l.phone AS lead_phone
            FROM quotations q
            LEFT JOIN destinations d ON d.id = q.destination_id
            LEFT JOIN staff_users su ON su.id = q.created_by
            LEFT JOIN leads l ON l.id = q.lead_id
            WHERE q.id = $1
        `, [id]),
        db.query(`SELECT * FROM quotation_hotels WHERE quotation_id = $1 ORDER BY sort_order`, [id]),
        db.query(`SELECT * FROM quotation_cars WHERE quotation_id = $1 ORDER BY sort_order`, [id]),
        db.query(`SELECT * FROM quotation_flights WHERE quotation_id = $1 ORDER BY sort_order`, [id]),
        db.query(`SELECT * FROM quotation_misc WHERE quotation_id = $1 ORDER BY sort_order`, [id])
    ]);
    if (!q.rows.length) return null;
    return { ...q.rows[0], hotels: hotels.rows, cars: cars.rows, flights: flights.rows, misc: misc.rows };
};

const getQuotation = async (req, res, next) => {
    try {
        const q = await getQuotationById(req.params.id);
        if (!q) return res.status(404).json({ error: 'Quotation not found' });
        res.json(q);
    } catch (err) { next(err); }
};

// ── List quotations ───────────────────────────────────────────────
const listQuotations = async (req, res, next) => {
    try {
        const { lead_id, status, page = 1, limit = 20 } = req.query;
        const conditions = [];
        const params = [];
        let p = 1;
        if (lead_id) { conditions.push(`q.lead_id = $${p++}`); params.push(lead_id); }
        if (status)  { conditions.push(`q.status = $${p++}`); params.push(status); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (Number(page) - 1) * Number(limit);
        params.push(Number(limit), offset);

        const result = await db.query(`
            SELECT q.id, q.quotation_number, q.status, q.trip_start_date, q.trip_end_date,
                   q.grand_total, q.adults, q.package_type, q.created_at,
                   q.destination_text, d.name AS destination_name,
                   l.full_name AS lead_name, l.phone AS lead_phone
            FROM quotations q
            LEFT JOIN destinations d ON d.id = q.destination_id
            LEFT JOIN leads l ON l.id = q.lead_id
            ${where}
            ORDER BY q.created_at DESC
            LIMIT $${p++} OFFSET $${p++}
        `, params);
        res.json(result.rows);
    } catch (err) { next(err); }
};

// ── Update quotation status ───────────────────────────────────────
const updateQuotationStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const timestamps = {
            sent: 'sent_at',
            accepted: 'accepted_at',
            rejected: 'rejected_at'
        };
        const tsField = timestamps[status];
        const query = tsField
            ? `UPDATE quotations SET status = $1, ${tsField} = NOW() WHERE id = $2 RETURNING *`
            : `UPDATE quotations SET status = $1 WHERE id = $2 RETURNING *`;
        const result = await db.query(query, [status, id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Quotation not found' });
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

// ── Fetch master rates for quotation builder ──────────────────────
const getHotelRatesForDestination = async (req, res, next) => {
    try {
        const { destination_id } = req.query;
        const result = await db.query(`
            SELECT hr.*, d.name AS destination_name
            FROM hotel_rates hr
            JOIN destinations d ON d.id = hr.destination_id
            WHERE hr.destination_id = $1 AND hr.is_active = true
            ORDER BY hr.star_rating, hr.room_type
        `, [destination_id]);
        res.json(result.rows);
    } catch (err) { next(err); }
};

const getCarRatesForDestination = async (req, res, next) => {
    try {
        const { destination_id } = req.query;
        const result = await db.query(`
            SELECT cr.*, ct.name AS car_type_name, ct.capacity
            FROM car_rates cr
            JOIN car_types ct ON ct.id = cr.car_type_id
            WHERE cr.destination_id = $1 AND cr.is_active = true
            ORDER BY cr.car_class, ct.name
        `, [destination_id]);
        res.json(result.rows);
    } catch (err) { next(err); }
};

module.exports = {
    createQuotation, getQuotation, listQuotations,
    updateQuotationStatus, getHotelRatesForDestination,
    getCarRatesForDestination
};
