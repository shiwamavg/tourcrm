const db = require('../config/db');

const generateBookingNumber = async (client) => {
    const year = new Date().getFullYear();
    const result = await client.query(
        `SELECT COUNT(*) FROM bookings WHERE EXTRACT(YEAR FROM created_at) = $1`, [year]
    );
    const seq = String(parseInt(result.rows[0].count) + 1).padStart(4, '0');
    return `BKG-${year}-${seq}`;
};

// ── Create booking from accepted quotation ────────────────────────
const createBooking = async (req, res, next) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { quotation_id, booking_fee_pct, special_requests } = req.body;

        const qResult = await client.query(
            `SELECT * FROM quotations WHERE id = $1 AND status = 'accepted'`, [quotation_id]
        );
        if (!qResult.rows.length) {
            return res.status(400).json({ error: 'Quotation not found or not in accepted status' });
        }
        const q = qResult.rows[0];

        // Get or create customer from lead
        let customerId = q.customer_id;
        if (!customerId) {
            const lead = await client.query(`SELECT * FROM leads WHERE id = $1`, [q.lead_id]);
            const l = lead.rows[0];
            const custResult = await client.query(`
                INSERT INTO customers (full_name, email, phone)
                VALUES ($1,$2,$3)
                ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
                RETURNING id
            `, [l.full_name, l.email, l.phone]);
            customerId = custResult.rows[0].id;
            await client.query(`UPDATE leads SET customer_id = $1, status = 'converted', converted_at = NOW() WHERE id = $2`, [customerId, q.lead_id]);
            await client.query(`UPDATE quotations SET customer_id = $1 WHERE id = $2`, [customerId, quotation_id]);
        }

        const bookingNumber = await generateBookingNumber(client);
        const feePct = booking_fee_pct || 20;
        const feeAmount = (q.grand_total * feePct / 100).toFixed(2);

        const bResult = await client.query(`
            INSERT INTO bookings (
                booking_number, quotation_id, lead_id, customer_id, created_by,
                destination_text, trip_start_date, trip_end_date, adults,
                children_below_5, children_above_5, total_amount,
                booking_fee_pct, booking_fee_amount, special_requests
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
            RETURNING *
        `, [bookingNumber, quotation_id, q.lead_id, customerId, req.user.id,
            q.destination_text, q.trip_start_date, q.trip_end_date, q.adults,
            q.children_below_5, q.children_above_5, q.grand_total,
            feePct, feeAmount, special_requests]);

        await client.query('COMMIT');

        // Auto-generate invoice
        await createInvoiceForBooking(bResult.rows[0].id, req.user.id);

        res.status(201).json(bResult.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally { client.release(); }
};

const createInvoiceForBooking = async (bookingId, staffId) => {
    const b = await db.query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
    if (!b.rows.length) return;
    const booking = b.rows[0];

    const settings = await db.query(`SELECT * FROM agency_settings LIMIT 1`);
    const gstPct = settings.rows[0]?.default_gst_pct || 5;
    const gstAmount = (booking.total_amount * gstPct / 100).toFixed(2);
    const totalWithGst = (parseFloat(booking.total_amount) + parseFloat(gstAmount)).toFixed(2);

    const year = new Date().getFullYear();
    const result = await db.query(`SELECT invoice_counter FROM agency_settings LIMIT 1`);
    const counter = result.rows[0]?.invoice_counter || 1000;
    const invoiceNumber = `INV-${year}-${counter}`;
    await db.query(`UPDATE agency_settings SET invoice_counter = invoice_counter + 1`);

    const halfGst = (parseFloat(gstAmount) / 2).toFixed(2);
    await db.query(`
        INSERT INTO invoices (invoice_number, booking_id, customer_id, subtotal,
            cgst_pct, cgst_amount, sgst_pct, sgst_amount, total_amount, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `, [invoiceNumber, bookingId, booking.customer_id, booking.total_amount,
        gstPct/2, halfGst, gstPct/2, halfGst, totalWithGst, staffId]);
};

// ── List bookings ─────────────────────────────────────────────────
const listBookings = async (req, res, next) => {
    try {
        const { status, payment_status, from_date, to_date, search, page = 1, limit = 20 } = req.query;
        const conditions = [];
        const params = [];
        let p = 1;
        if (status)         { conditions.push(`b.status = $${p++}`); params.push(status); }
        if (payment_status) { conditions.push(`b.payment_status = $${p++}`); params.push(payment_status); }
        if (from_date)      { conditions.push(`b.trip_start_date >= $${p++}`); params.push(from_date); }
        if (to_date)        { conditions.push(`b.trip_start_date <= $${p++}`); params.push(to_date); }
        if (search)         { conditions.push(`(c.full_name ILIKE $${p} OR c.phone ILIKE $${p} OR b.booking_number ILIKE $${p})`); params.push(`%${search}%`); p++; }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (Number(page) - 1) * Number(limit);
        params.push(Number(limit), offset);

        const result = await db.query(`
            SELECT b.*, c.full_name AS customer_name, c.phone AS customer_phone,
                   su.full_name AS created_by_name
            FROM bookings b
            JOIN customers c ON c.id = b.customer_id
            JOIN staff_users su ON su.id = b.created_by
            ${where}
            ORDER BY b.created_at DESC
            LIMIT $${p++} OFFSET $${p++}
        `, params);
        res.json(result.rows);
    } catch (err) { next(err); }
};

// ── Get booking detail ────────────────────────────────────────────
const getBooking = async (req, res, next) => {
    try {
        const { id } = req.params;
        const b = await db.query(`
            SELECT b.*, c.full_name AS customer_name, c.phone AS customer_phone,
                   c.email AS customer_email, su.full_name AS created_by_name
            FROM bookings b
            JOIN customers c ON c.id = b.customer_id
            JOIN staff_users su ON su.id = b.created_by
            WHERE b.id = $1
        `, [id]);
        if (!b.rows.length) return res.status(404).json({ error: 'Booking not found' });

        const payments = await db.query(
            `SELECT * FROM payments WHERE booking_id = $1 ORDER BY created_at DESC`, [id]
        );
        const invoice = await db.query(
            `SELECT * FROM invoices WHERE booking_id = $1`, [id]
        );
        res.json({ ...b.rows[0], payments: payments.rows, invoice: invoice.rows[0] });
    } catch (err) { next(err); }
};

// ── Record offline payment ────────────────────────────────────────
const recordOfflinePayment = async (req, res, next) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { amount, payment_method, reference_number, payment_date, notes } = req.body;

        await client.query(`
            INSERT INTO payments (booking_id, customer_id, amount, payment_method, payment_status,
                reference_number, payment_date, notes, created_by)
            SELECT $1, customer_id, $2, $3, 'paid', $4, $5, $6, $7
            FROM bookings WHERE id = $1
        `, [id, amount, payment_method, reference_number, payment_date, notes, req.user.id]);

        const updated = await client.query(`
            UPDATE bookings
            SET total_paid = total_paid + $1,
                payment_status = CASE
                    WHEN total_paid + $1 >= total_amount THEN 'paid'
                    WHEN total_paid + $1 > 0 THEN 'partial'
                    ELSE payment_status END
            WHERE id = $2 RETURNING *
        `, [amount, id]);

        await client.query('COMMIT');
        res.json(updated.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally { client.release(); }
};

module.exports = { createBooking, listBookings, getBooking, recordOfflinePayment };
