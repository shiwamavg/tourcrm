// src/controllers/booking-traveller.controller.js
const db = require('../config/db');

const listByBooking = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM booking_travellers WHERE booking_id = ? AND company_id = ? ORDER BY id',
            [req.params.bookingId, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const saveBulk = async (req, res, next) => {
    try {
        const { travellers } = req.body || [];
        const bookingId = req.params.bookingId;

        // Verify booking belongs to this company
        const [[booking]] = await db.query(
            'SELECT id FROM bookings WHERE id = ? AND company_id = ?',
            [bookingId, req.companyId]
        );
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Delete existing travellers for this booking (replace strategy)
        await db.query('DELETE FROM booking_travellers WHERE booking_id = ? AND company_id = ?', [bookingId, req.companyId]);

        // Insert new travellers
        if (travellers && travellers.length > 0) {
            const values = travellers.map(t => [
                bookingId, req.companyId, t.full_name, t.age || null,
                t.aadhar_number || null, t.traveller_type || 'adult'
            ]);
            await db.query(
                'INSERT INTO booking_travellers (booking_id, company_id, full_name, age, aadhar_number, traveller_type) VALUES ?',
                [values]
            );
        }

        // Return updated list
        const [rows] = await db.query(
            'SELECT * FROM booking_travellers WHERE booking_id = ? AND company_id = ? ORDER BY id',
            [bookingId, req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

module.exports = { listByBooking, saveBulk };
