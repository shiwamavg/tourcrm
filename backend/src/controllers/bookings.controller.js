// src/controllers/bookings.controller.js
const db = require('../config/db');

const listBookings = async (req, res, next) => {
    try {
        const { status, payment_status, q, page = 1, limit = 20 } = req.query;
        const where = ['b.company_id = ?'];
        const params = [req.companyId];
        if (status)         { where.push('b.status = ?');         params.push(status); }
        if (payment_status) { where.push('b.payment_status = ?'); params.push(payment_status); }
        if (q) {
            where.push('(b.booking_number LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ? OR b.customer_email LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like, like, like);
        }
        const whereSql = `WHERE ${where.join(' AND ')}`;
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT b.id, b.booking_number, b.customer_name, b.customer_phone, b.customer_email,
                    b.trip_start_date, b.trip_end_date, b.total_amount, b.amount_paid,
                    b.balance_due, b.status, b.payment_status, b.created_at,
                    b.destination_text, q.package_type, d.name AS destination_name, b.package_id,
                    p.title AS package_title
               FROM bookings b
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
               LEFT JOIN packages p ON p.id = b.package_id AND p.company_id = b.company_id
               ${whereSql}
              ORDER BY b.id DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM bookings b ${whereSql}`, params
        );
        res.json({ items: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const getBooking = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT b.*, d.name AS destination_name, q.quotation_number, q.package_type,
                    pq.quotation_number AS parent_quotation_number,
                    su.full_name AS created_by_name,
                    p.title AS package_title,
                    a.agency_name AS agent_agency_name, a.agent_name AS agent_contact_name
               FROM bookings b
               LEFT JOIN quotations q  ON q.id  = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN quotations pq ON pq.id = q.parent_quotation_id AND pq.company_id = b.company_id
               LEFT JOIN destinations d ON d.id = q.destination_id AND d.company_id = b.company_id
               LEFT JOIN staff_users  su ON su.id = b.created_by AND su.company_id = b.company_id
               LEFT JOIN packages     p  ON p.id  = b.package_id AND p.company_id = b.company_id
               LEFT JOIN agents       a  ON a.id  = b.agent_id AND a.company_id = b.company_id
              WHERE b.id = ? AND b.company_id = ?`, [req.params.id, req.companyId]
        );
        const b = rows[0];
        if (!b) return res.status(404).json({ error: 'Booking not found' });
        const cid = req.companyId;
        const [hotels, cars, flights, payments, invoices, reviews] = await Promise.all([
            db.query('SELECT * FROM quotation_hotels WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM quotation_cars WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM quotation_flights WHERE quotation_id = ? AND company_id = ? ORDER BY sort_order', [b.quotation_id, cid]),
            db.query('SELECT * FROM payments WHERE booking_id = ? AND company_id = ? ORDER BY id DESC', [b.id, cid]),
            db.query('SELECT * FROM invoices WHERE booking_id = ? AND company_id = ? ORDER BY id DESC', [b.id, cid]),
            db.query('SELECT id, rating, title, comment, customer_name, is_visible, created_at FROM reviews WHERE booking_id = ? AND company_id = ?', [b.id, cid])
        ]);
        res.json({
            ...b,
            hotels: hotels[0], cars: cars[0], flights: flights[0],
            payments: payments[0], invoices: invoices[0], reviews: reviews[0]
        });
    } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
    try {
        const { status } = req.body || {};
        if (!['pending','confirmed','cancelled','completed'].includes(status)) {
            return res.status(400).json({ error: 'status must be pending, confirmed, cancelled, or completed' });
        }

        // Fetch current status and lead/quotation details for timeline logging
        const [[booking]] = await db.query(
            `SELECT b.status, b.booking_number, b.quotation_id, q.lead_id
               FROM bookings b
          LEFT JOIN quotations q ON b.quotation_id = q.id AND q.company_id = b.company_id
              WHERE b.id = ? AND b.company_id = ?`,
            [req.params.id, req.companyId]
        );
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        const [r] = await db.query(
            'UPDATE bookings SET status = ? WHERE id = ? AND company_id = ?',
            [status, req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Booking not found' });

        // Update commission status
        if (status === 'cancelled') {
            await db.query(
                "UPDATE commissions SET status = 'cancelled' WHERE booking_id = ? AND company_id = ? AND status != 'paid'",
                [req.params.id, req.companyId]
            );
        } else {
            await db.query(
                "UPDATE commissions SET status = 'pending' WHERE booking_id = ? AND company_id = ? AND status = 'cancelled'",
                [req.params.id, req.companyId]
            );
        }

        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: req.companyId,
                lead_id: booking.lead_id || null,
                quotation_id: booking.quotation_id || null,
                booking_id: req.params.id,
                user_id: req.user.id,
                notes: `Booking ${booking.booking_number} status updated from "${booking.status}" to "${status}".`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for booking status update:', e.message);
        }

        const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const generateBookingNumber = async (conn, companyId) => {
    const year = new Date().getFullYear();
    const [rows] = await conn.query(
        'SELECT COUNT(*) AS c FROM bookings WHERE YEAR(created_at) = ?',
        [year]
    );
    const seq = String(Number(rows[0].c || 0) + 1).padStart(4, '0');
    return `BKG-${year}-${seq}`;
};

const createBooking = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const { quotation_id, booking_fee_pct, special_requests, internal_notes } = req.body || {};

        if (!quotation_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'quotation_id is required' });
        }

        const [qResult] = await conn.query(
            `SELECT * FROM quotations WHERE id = ? AND company_id = ?`,
            [quotation_id, req.companyId]
        );
        if (!qResult.length) {
            await conn.rollback();
            return res.status(400).json({ error: 'Quotation not found' });
        }
        const q = qResult[0];

        let agentId = q.agent_id || null;
        let agentCommission = 0.00;

        if (agentId) {
            const [agentRows] = await conn.query(
                'SELECT commission_type, commission_rate FROM agents WHERE id = ? AND company_id = ?',
                [agentId, req.companyId]
            );
            if (agentRows.length > 0) {
                const agent = agentRows[0];
                if (agent.commission_type === 'percentage') {
                    agentCommission = Number(q.subtotal) * (Number(agent.commission_rate) / 100);
                } else if (agent.commission_type === 'fixed') {
                    agentCommission = Number(agent.commission_rate);
                }
            }
        }

        const bookingNumber = await generateBookingNumber(conn, req.companyId);
        const feePct = booking_fee_pct || 20;
        const feeAmount = (q.grand_total * feePct / 100);

        const [bResult] = await conn.query(`
            INSERT INTO bookings (
                booking_number, quotation_id, package_id, referrer_booking_id, customer_name, customer_phone, customer_email,
                destination_text, trip_start_date, trip_end_date, adults,
                children_below_5, children_above_5, total_amount,
                booking_fee_pct, booking_fee_amount, amount_paid, status, payment_status,
                special_requests, internal_notes, created_by, company_id, agent_id, agent_commission
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'pending','pending',?,?,?,?,?,?)
        `, [
            bookingNumber, quotation_id, q.package_id || null, q.referrer_booking_id || null, q.customer_name, q.customer_phone, q.customer_email || null,
            q.destination_text, q.trip_start_date, q.trip_end_date, q.adults,
            q.children_below_5, q.children_above_5, q.grand_total,
            feePct, feeAmount, special_requests || null, internal_notes || null, req.user.id, req.companyId,
            agentId, agentCommission
        ]);

        const bookingId = bResult.insertId;

        if (agentId) {
            await conn.query(`
                INSERT INTO commissions (company_id, agent_id, booking_id, amount, status)
                VALUES (?, ?, ?, ?, 'pending')
            `, [req.companyId, agentId, bookingId, agentCommission]);
        }

        if (q.referrer_booking_id && q.package_id) {
            const [pkgs] = await conn.query(
                'SELECT price, referral_commission_type, referral_commission_rate FROM packages WHERE id = ?',
                [q.package_id]
            );
            if (pkgs[0]) {
                const pkg = pkgs[0];
                let refCommission = 0.00;
                if (pkg.referral_commission_type === 'percentage') {
                    refCommission = q.grand_total * (Number(pkg.referral_commission_rate) / 100);
                } else if (pkg.referral_commission_type === 'fixed') {
                    refCommission = Number(pkg.referral_commission_rate);
                }
                
                if (refCommission > 0) {
                    await conn.query(`
                        INSERT INTO commissions (company_id, referrer_booking_id, booking_id, amount, status)
                        VALUES (?, ?, ?, ?, 'pending')
                    `, [req.companyId, q.referrer_booking_id, bookingId, refCommission]);
                }
            }
        }

        await conn.query(
            `UPDATE quotations SET status = 'accepted' WHERE id = ? AND company_id = ?`,
            [quotation_id, req.companyId]
        );

        if (q.lead_id) {
            await conn.query(
                `UPDATE leads SET status = 'converted' WHERE id = ? AND company_id = ?`,
                [q.lead_id, req.companyId]
            );
        }

        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(conn, {
                company_id: req.companyId,
                lead_id: q.lead_id || null,
                quotation_id,
                booking_id: bookingId,
                user_id: req.user.id,
                notes: `Booking ${bookingNumber} created from Quotation ${q.quotation_number}.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for booking creation:', e.message);
        }

        // Create default operational tasks for this booking
        try {
            const { createTasksForBooking } = require('./booking-task.controller');
            await createTasksForBooking({
                id: bookingId,
                company_id: req.companyId,
                trip_start_date: q.trip_start_date
            });
        } catch (e) {
            console.error('Failed to create default booking tasks:', e.message);
        }

        await conn.commit();

        const [rows] = await db.query('SELECT * FROM bookings WHERE id = ? AND company_id = ?', [bookingId, req.companyId]);
        res.status(201).json(rows[0]);
    } catch (err) {
        try { await conn.rollback(); } catch {}
        next(err);
    } finally {
        conn.release();
    }
};

const getCalendarBookings = async (req, res, next) => {
    try {
        const { year, month } = req.query;
        const y = parseInt(year) || new Date().getFullYear();
        const m = parseInt(month) || (new Date().getMonth() + 1);
        // Build date range: first day of month to last day of month
        const startDate = `${y}-${String(m).padStart(2,'0')}-01`;
        const nextMonth = m === 12 ? `${y+1}-01-01` : `${y}-${String(m+1).padStart(2,'0')}-01`;

        const [rows] = await db.query(
            `SELECT b.id, b.booking_number, b.customer_name, b.status, b.payment_status,
                    b.trip_start_date, b.trip_end_date, b.total_amount, b.adults,
                    b.destination_text, q.package_type,
                    COALESCE(p.title, q.destination_text, b.destination_text) AS tour_title,
                    COALESCE(p.category, q.package_type, 'Individual / Family') AS category
               FROM bookings b
               LEFT JOIN quotations q ON q.id = b.quotation_id AND q.company_id = b.company_id
               LEFT JOIN packages p   ON p.id = b.package_id AND p.company_id = b.company_id
              WHERE b.company_id = ?
                AND b.status != 'cancelled'
                AND b.trip_start_date >= ? AND b.trip_start_date < ?
              ORDER BY b.trip_start_date ASC`,
            [req.companyId, startDate, nextMonth]
        );
        res.json({ items: rows, year: y, month: m });
    } catch (err) { next(err); }
};

const recalculateBookingProfit = async (bookingId, companyId) => {
    // 1. Get booking total amount and agent commission
    const [[booking]] = await db.query(
        'SELECT total_amount, agent_commission FROM bookings WHERE id = ? AND company_id = ?',
        [bookingId, companyId]
    );
    if (!booking) return;

    // 2. Sum up vendor costing cost_amount
    const [[costRow]] = await db.query(
        'SELECT SUM(cost_amount) AS total_cost FROM vendor_ledgers WHERE booking_id = ? AND company_id = ?',
        [bookingId, companyId]
    );
    const totalCost = Number(costRow.total_cost || 0);

    // 3. Sum up referral commissions
    const [[referralRow]] = await db.query(
        'SELECT SUM(amount) AS total_ref FROM commissions WHERE booking_id = ? AND company_id = ? AND status != "cancelled" AND agent_id IS NULL',
        [bookingId, companyId]
    );
    const totalReferral = Number(referralRow.total_ref || 0);

    // 4. Net Profit calculation
    const netProfit = Number(booking.total_amount) - Number(booking.agent_commission) - totalCost - totalReferral;

    // 5. Update bookings table
    await db.query(
        'UPDATE bookings SET vendor_cost = ?, net_profit = ? WHERE id = ? AND company_id = ?',
        [totalCost, netProfit, bookingId, companyId]
    );
};

const listVendorLedgers = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT vl.*, s.name AS supplier_name, s.type AS supplier_type
               FROM vendor_ledgers vl
               JOIN suppliers s ON s.id = vl.supplier_id
              WHERE vl.booking_id = ? AND vl.company_id = ?
              ORDER BY vl.id DESC`,
            [req.params.id, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const createVendorLedger = async (req, res, next) => {
    try {
        const { supplier_id, cost_amount, paid_amount, notes } = req.body || {};
        if (!supplier_id || cost_amount == null) {
            return res.status(400).json({ error: 'supplier_id and cost_amount are required' });
        }
        
        let status = 'pending';
        const cost = Number(cost_amount);
        const paid = Number(paid_amount || 0);
        if (paid >= cost && cost > 0) {
            status = 'paid';
        } else if (paid > 0) {
            status = 'partial';
        }

        const [r] = await db.query(
            `INSERT INTO vendor_ledgers (company_id, booking_id, supplier_id, cost_amount, paid_amount, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.companyId, req.params.id, supplier_id, cost, paid, status, notes || null]
        );

        await recalculateBookingProfit(req.params.id, req.companyId);

        const [rows] = await db.query('SELECT * FROM vendor_ledgers WHERE id = ?', [r.insertId]);
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
};

const updateVendorLedger = async (req, res, next) => {
    try {
        const { cost_amount, paid_amount, notes } = req.body || {};
        const { id: bookingId, ledgerId } = req.params;

        const [[existing]] = await db.query(
            'SELECT * FROM vendor_ledgers WHERE id = ? AND booking_id = ? AND company_id = ?',
            [ledgerId, bookingId, req.companyId]
        );
        if (!existing) return res.status(404).json({ error: 'Vendor ledger entry not found' });

        const cost = cost_amount != null ? Number(cost_amount) : Number(existing.cost_amount);
        const paid = paid_amount != null ? Number(paid_amount) : Number(existing.paid_amount);

        let status = 'pending';
        if (paid >= cost && cost > 0) {
            status = 'paid';
        } else if (paid > 0) {
            status = 'partial';
        }

        await db.query(
            `UPDATE vendor_ledgers
                SET cost_amount = ?, paid_amount = ?, status = ?, notes = ?
              WHERE id = ? AND booking_id = ? AND company_id = ?`,
            [cost, paid, status, notes !== undefined ? notes : existing.notes, ledgerId, bookingId, req.companyId]
        );

        await recalculateBookingProfit(bookingId, req.companyId);

        const [rows] = await db.query('SELECT * FROM vendor_ledgers WHERE id = ?', [ledgerId]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

const deleteVendorLedger = async (req, res, next) => {
    try {
        const { id: bookingId, ledgerId } = req.params;
        const [r] = await db.query(
            'DELETE FROM vendor_ledgers WHERE id = ? AND booking_id = ? AND company_id = ?',
            [ledgerId, bookingId, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Vendor ledger entry not found' });

        await recalculateBookingProfit(bookingId, req.companyId);

        res.json({ message: 'Deleted successfully' });
    } catch (err) { next(err); }
};

module.exports = {
    listBookings,
    getBooking,
    updateStatus,
    createBooking,
    getCalendarBookings,
    listVendorLedgers,
    createVendorLedger,
    updateVendorLedger,
    deleteVendorLedger
};
