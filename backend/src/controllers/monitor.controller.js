// src/controllers/monitor.controller.js
const db = require('../config/db');

const metrics = async (req, res, next) => {
    try {
        const [[companies]] = await db.query('SELECT COUNT(*) AS total FROM companies');
        const [[users]] = await db.query('SELECT COUNT(*) AS total FROM staff_users');
        const [[leads]] = await db.query('SELECT COUNT(*) AS total FROM leads');
        const [[quotations]] = await db.query('SELECT COUNT(*) AS total FROM quotations');
        const [[bookings]] = await db.query('SELECT COUNT(*) AS total FROM bookings');

        res.json({
            ts: new Date().toISOString(),
            companies: Number(companies.total || 0),
            users: Number(users.total || 0),
            leads: Number(leads.total || 0),
            quotations: Number(quotations.total || 0),
            bookings: Number(bookings.total || 0)
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { metrics };
