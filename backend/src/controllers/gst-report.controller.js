// src/controllers/gst-report.controller.js
const db = require('../config/db');

const gstReport = async (req, res, next) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ error: 'from and to dates are required' });
        }

        const [rows] = await db.query(
            `SELECT i.id, i.invoice_number, i.issued_at, i.subtotal, i.gst_pct,
                    i.cgst_amount, i.sgst_amount, i.igst_amount, i.tax_amount, i.total,
                    i.hsn_sac, i.customer_gstin,
                    b.booking_number, b.customer_name, b.customer_email, b.customer_phone
               FROM invoices i
               JOIN bookings b ON b.id = i.booking_id AND b.company_id = i.company_id
              WHERE i.company_id = ?
                AND DATE(i.issued_at) >= ?
                AND DATE(i.issued_at) <= ?
           ORDER BY i.issued_at`,
            [req.companyId, from, to]
        );

        const totals = rows.reduce((acc, r) => {
            acc.subtotal += Number(r.subtotal || 0);
            acc.cgst += Number(r.cgst_amount || 0);
            acc.sgst += Number(r.sgst_amount || 0);
            acc.igst += Number(r.igst_amount || 0);
            acc.tax += Number(r.tax_amount || 0);
            acc.total += Number(r.total || 0);
            return acc;
        }, { subtotal: 0, cgst: 0, sgst: 0, igst: 0, tax: 0, total: 0 });

        res.json({ items: rows, totals, from, to });
    } catch (err) { next(err); }
};

module.exports = { gstReport };
