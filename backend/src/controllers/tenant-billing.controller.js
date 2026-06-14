// src/controllers/tenant-billing.controller.js
const db = require('../config/db');

const getCurrentPlan = async (req, res, next) => {
    try {
        const companyId = req.companyId;

        const [companies] = await db.query(
            `SELECT c.id, c.name, c.slug, c.email, c.phone, c.status, c.subscription_status,
                    c.trial_ends_at, c.subscription_package_id, c.subscription_start_date, c.subscription_end_date,
                    c.max_users, c.max_leads, c.max_quotations, c.max_bookings, c.features,
                    sp.name AS package_name, sp.price_monthly, sp.price_yearly
               FROM companies c
          LEFT JOIN subscription_packages sp ON sp.id = c.subscription_package_id
              WHERE c.id = ?`,
            [companyId]
        );
        const company = companies[0];
        if (!company) return res.status(404).json({ error: 'Company not found' });

        try {
            company.features = typeof company.features === 'string' ? JSON.parse(company.features) : (company.features || []);
        } catch {
            company.features = [];
        }

        // Fetch current usage
        const [[counts]] = await db.query(
            `SELECT
                (SELECT COUNT(*) FROM staff_users WHERE company_id = ? AND is_active = 1) AS users,
                (SELECT COUNT(*) FROM leads WHERE company_id = ?) AS leads,
                (SELECT COUNT(*) FROM quotations WHERE company_id = ?) AS quotations,
                (SELECT COUNT(*) FROM bookings WHERE company_id = ?) AS bookings,
                (SELECT COUNT(*) FROM invoices WHERE company_id = ?) AS invoices,
                (SELECT COUNT(*) FROM visas WHERE company_id = ?) AS visas,
                (SELECT COUNT(*) FROM email_campaigns WHERE company_id = ?) AS campaigns`,
            [companyId, companyId, companyId, companyId, companyId, companyId, companyId]
        );

        res.json({
            company,
            usage: {
                users: counts.users || 0,
                leads: counts.leads || 0,
                quotations: counts.quotations || 0,
                bookings: counts.bookings || 0,
                invoices: counts.invoices || 0,
                visas: counts.visas || 0,
                campaigns: counts.campaigns || 0
            }
        });
    } catch (err) { next(err); }
};

const getInvoices = async (req, res, next) => {
    try {
        const companyId = req.companyId;
        const [rows] = await db.query(
            `SELECT id, invoice_number, billing_period_start, billing_period_end, amount, gst_amount, total_amount, status, due_date, paid_at, pdf_path, notes, created_at
               FROM company_invoices
              WHERE company_id = ?
           ORDER BY id DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const changePlan = async (req, res, next) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const companyId = req.companyId;
        const { package_id, billing_cycle = 'monthly' } = req.body || {};

        if (!package_id) {
            await conn.rollback();
            return res.status(400).json({ error: 'package_id is required' });
        }

        const [pkgs] = await conn.query(
            'SELECT * FROM subscription_packages WHERE id = ? AND is_active = 1',
            [package_id]
        );
        const pkg = pkgs[0];
        if (!pkg) {
            await conn.rollback();
            return res.status(400).json({ error: 'Package not found or inactive' });
        }

        const price = billing_cycle === 'yearly' ? pkg.price_yearly : pkg.price_monthly;
        const gst = price * 0.18;
        const total = price + gst;

        // Create subscription history entry
        const startDate = new Date().toISOString().slice(0, 10);
        const duration = billing_cycle === 'yearly' ? 365 : 30;
        const endDate = new Date(Date.now() + duration * 86400000).toISOString().slice(0, 10);

        const [subIns] = await conn.query(
            `INSERT INTO company_subscriptions
                (company_id, package_id, billing_cycle, amount, gst_amount, total_amount, status, start_date, end_date)
             VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
            [companyId, package_id, billing_cycle, price, gst, total, startDate, endDate]
        );

        // Update company package parameters and status
        await conn.query(
            `UPDATE companies
                SET subscription_package_id = ?,
                    subscription_status = 'active',
                    status = 'active',
                    subscription_start_date = ?,
                    subscription_end_date = ?,
                    max_users = ?,
                    max_leads = ?,
                    max_quotations = ?,
                    max_bookings = ?,
                    max_invoices = ?,
                    max_visas = ?,
                    max_campaigns = ?,
                    features = ?
              WHERE id = ?`,
            [
                package_id,
                startDate,
                endDate,
                pkg.max_users,
                pkg.max_leads,
                pkg.max_quotations,
                pkg.max_bookings,
                pkg.max_invoices,
                pkg.max_visas,
                pkg.max_campaigns,
                pkg.features,
                companyId
            ]
        );

        // Auto-create initial billing invoice for self-serve renewal
        const invoiceNumber = `SAAS-INV-${companyId}-${Date.now().toString().slice(-6)}`;
        await conn.query(
            `INSERT INTO company_invoices
                (company_id, subscription_id, invoice_number, billing_period_start, billing_period_end, amount, gst_amount, total_amount, status, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', DATE_ADD(CURDATE(), INTERVAL 7 DAY))`,
            [companyId, subIns.insertId, invoiceNumber, startDate, endDate, price, gst, total]
        );

        await conn.commit();
        res.json({ ok: true, message: `Successfully upgraded to package: ${pkg.name}` });
    } catch (err) {
        await conn.rollback();
        next(err);
    } finally {
        conn.release();
    }
};

module.exports = { getCurrentPlan, getInvoices, changePlan };
