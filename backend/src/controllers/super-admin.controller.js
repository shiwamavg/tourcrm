// src/controllers/super-admin.controller.js
// Super admin endpoints for managing the SaaS platform

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const fs = require('fs');
const path = require('path');

const COMPANY_INVOICE_DIR = path.resolve(
    process.cwd(),
    process.env.INVOICE_DIR || 'uploads/invoices'
);
try { fs.mkdirSync(COMPANY_INVOICE_DIR, { recursive: true }); } catch (e) {}

const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || env.jwt.secret;

const SALT_ROUNDS = 10;

// ── Helpers ──────────────────────────────────────────────────
const signSuperAdminToken = (admin) =>
    jwt.sign(
        { sub: admin.id, email: admin.email, name: admin.full_name, type: 'super_admin' },
        SUPER_ADMIN_SECRET,
        { expiresIn: '24h' }
    );

// ── Login ────────────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const [rows] = await db.query(
            'SELECT id, full_name, email, password_hash, is_active FROM super_admins WHERE email = ? LIMIT 1',
            [email]
        );
        const admin = rows[0];
        if (!admin || !admin.is_active) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const ok = await bcrypt.compare(password, admin.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        await db.query('UPDATE super_admins SET last_login_at = NOW() WHERE id = ?', [admin.id]);
        const token = signSuperAdminToken(admin);
        res.json({
            access_token: token,
            admin: { id: admin.id, full_name: admin.full_name, email: admin.email }
        });
    } catch (err) { next(err); }
};

// ── Dashboard Stats ──────────────────────────────────────────
const dashboardStats = async (req, res, next) => {
    try {
        const [[companies]] = await db.query('SELECT COUNT(*) AS total FROM companies');
        const [[active]] = await db.query("SELECT COUNT(*) AS total FROM companies WHERE status = 'active'");
        const [[suspended]] = await db.query("SELECT COUNT(*) AS total FROM companies WHERE status = 'suspended'");
        const [[trial]] = await db.query("SELECT COUNT(*) AS total FROM companies WHERE subscription_status = 'trial'");
        const [[expired]] = await db.query("SELECT COUNT(*) AS total FROM companies WHERE subscription_status = 'expired'");
        const [[revenue]] = await db.query(
            "SELECT COALESCE(SUM(total_amount),0) AS total FROM company_payments WHERE status = 'paid'"
        );
        const [[monthRevenue]] = await db.query(
            "SELECT COALESCE(SUM(total_amount),0) AS total FROM company_payments WHERE status = 'paid' AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())"
        );
        const [[users]] = await db.query('SELECT COUNT(*) AS total FROM staff_users');
        const [[leads]] = await db.query('SELECT COUNT(*) AS total FROM leads');
        const [[quotations]] = await db.query('SELECT COUNT(*) AS total FROM quotations');

        res.json({
            companies: companies.total,
            active_companies: active.total,
            suspended_companies: suspended.total,
            trial_companies: trial.total,
            expired_companies: expired.total,
            total_revenue: revenue.total,
            month_revenue: monthRevenue.total,
            total_users: users.total,
            total_leads: leads.total,
            total_quotations: quotations.total
        });
    } catch (err) { next(err); }
};

// ── Companies ────────────────────────────────────────────────
const listCompanies = async (req, res, next) => {
    try {
        const { q, status, subscription_status, page = 1, limit = 20 } = req.query;
        const where = [];
        const params = [];
        if (q) {
            where.push('(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.slug LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like, like, like);
        }
        if (status) { where.push('c.status = ?'); params.push(status); }
        if (subscription_status) { where.push('c.subscription_status = ?'); params.push(subscription_status); }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT c.*,
                    (SELECT COUNT(*) FROM staff_users WHERE company_id = c.id) AS user_count,
                    (SELECT COUNT(*) FROM leads WHERE company_id = c.id) AS lead_count,
                    (SELECT COUNT(*) FROM quotations WHERE company_id = c.id) AS quotation_count,
                    (SELECT COUNT(*) FROM bookings WHERE company_id = c.id) AS booking_count,
                    sp.name AS package_name
               FROM companies c
          LEFT JOIN subscription_packages sp ON sp.id = c.subscription_package_id
               ${whereSql}
           ORDER BY c.created_at DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(`SELECT COUNT(*) AS total FROM companies c ${whereSql}`, params);

        // Parse features JSON
        const items = rows.map(r => {
            try { r.features = typeof r.features === 'string' ? JSON.parse(r.features) : r.features; } catch { r.features = []; }
            return r;
        });

        res.json({ items, companies: items, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const getCompany = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*, sp.name AS package_name
               FROM companies c
          LEFT JOIN subscription_packages sp ON sp.id = c.subscription_package_id
              WHERE c.id = ?`,
            [req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Company not found' });
        const company = rows[0];
        try { company.features = typeof company.features === 'string' ? JSON.parse(company.features) : company.features; } catch { company.features = []; }
        res.json(company);
    } catch (err) { next(err); }
};

const createCompany = async (req, res, next) => {
    try {
        const {
            name, slug, email, phone, address, gstin, website,
            status = 'pending', subscription_status = 'trial',
            max_users = 5, max_leads = 1000, max_quotations = 500, max_bookings = 200,
            features, trial_days = 14,
            contact_name, contact_email, contact_phone, password, package_id
        } = req.body || {};

        if (!name?.trim()) return res.status(400).json({ error: 'Company name is required' });

        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        let finalMaxUsers = max_users;
        let finalMaxLeads = max_leads;
        let finalMaxQuotations = max_quotations;
        let finalMaxBookings = max_bookings;
        let finalFeatures = features;
        const finalPackageId = package_id || null;

        if (finalPackageId) {
            const [pkgs] = await db.query('SELECT * FROM subscription_packages WHERE id = ?', [finalPackageId]);
            if (pkgs[0]) {
                const pkg = pkgs[0];
                finalMaxUsers = pkg.max_users;
                finalMaxLeads = pkg.max_leads;
                finalMaxQuotations = pkg.max_quotations;
                finalMaxBookings = pkg.max_bookings;
                try {
                    finalFeatures = typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features;
                } catch {
                    finalFeatures = pkg.features;
                }
            }
        }

        const trialEndsAt = trial_days ? new Date(Date.now() + trial_days * 86400000).toISOString().slice(0, 19).replace('T', ' ') : null;

        const [r] = await db.query(
            `INSERT INTO companies
                (name, slug, email, phone, address, gstin, website, status, subscription_status,
                 trial_ends_at, max_users, max_leads, max_quotations, max_bookings, features,
                 contact_name, contact_email, contact_phone, subscription_package_id, subscription_start_date)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, NOW())`,
            [name.trim(), finalSlug || null, email || contact_email || null, phone || contact_phone || null, address || null, gstin || null, website || null,
             status, subscription_status, trialEndsAt, finalMaxUsers, finalMaxLeads, finalMaxQuotations, finalMaxBookings,
             finalFeatures ? JSON.stringify(finalFeatures) : null,
             contact_name || null, contact_email || null, contact_phone || null, finalPackageId]
        );

        const companyId = r.insertId;
        if (finalPackageId) {
            const startDate = new Date().toISOString().slice(0, 10);
            const endDate = trialEndsAt ? trialEndsAt.slice(0, 10) : startDate;
            await db.query(
                `INSERT INTO company_subscriptions
                    (company_id, package_id, billing_cycle, amount, gst_amount, total_amount, status, start_date, end_date)
                 VALUES (?, ?, 'trial', 0, 0, 0, 'active', ?, ?)`,
                [companyId, finalPackageId, startDate, endDate]
            );
        }

        if (password) {
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            await db.query(
                `INSERT INTO staff_users (company_id, full_name, email, phone, password_hash, role, is_active)
                 VALUES (?, ?, ?, ?, ?, 'admin', 1)`,
                [companyId, contact_name || 'Admin User', contact_email || email, contact_phone || phone || null, passwordHash]
            );
        }

        const [created] = await db.query('SELECT * FROM companies WHERE id = ?', [companyId]);
        res.status(201).json(created[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Company name or slug already exists' });
        next(err);
    }
};

const updateCompany = async (req, res, next) => {
    try {
        const id = req.params.id;

        if (req.body.package_id !== undefined) {
            req.body.subscription_package_id = req.body.package_id;
        }

        if (req.body.subscription_package_id) {
            const [pkgs] = await db.query('SELECT * FROM subscription_packages WHERE id = ?', [req.body.subscription_package_id]);
            if (pkgs[0]) {
                const pkg = pkgs[0];
                req.body.max_users = pkg.max_users;
                req.body.max_leads = pkg.max_leads;
                req.body.max_quotations = pkg.max_quotations;
                req.body.max_bookings = pkg.max_bookings;
                try {
                    req.body.features = typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features;
                } catch {
                    req.body.features = pkg.features;
                }
            }
        }

        const allowed = ['name','slug','email','phone','address','gstin','logo_url','website',
                         'status','subscription_status','trial_ends_at','max_users','max_leads',
                         'max_quotations','max_bookings','features','subscription_package_id',
                         'contact_name','contact_email','contact_phone'];
        const sets = [];
        const params = [];

        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                sets.push(`${k} = ?`);
                params.push(k === 'features' ? JSON.stringify(req.body[k]) : req.body[k]);
            }
        }
        if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

        params.push(id);
        await db.query(`UPDATE companies SET ${sets.join(', ')} WHERE id = ?`, params);
        const [rows] = await db.query('SELECT * FROM companies WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Company name or slug already exists' });
        next(err);
    }
};

const toggleCompanyStatus = async (req, res, next) => {
    try {
        const { status } = req.body || {};
        if (!status || !['active','suspended','inactive','pending'].includes(status)) {
            return res.status(400).json({ error: 'Valid status required (active, suspended, inactive, pending)' });
        }
        const [r] = await db.query('UPDATE companies SET status = ? WHERE id = ?', [status, req.params.id]);
        if (!r.affectedRows) return res.status(404).json({ error: 'Company not found' });
        res.json({ ok: true, id: req.params.id, status });
    } catch (err) { next(err); }
};

// ── Packages ─────────────────────────────────────────────────
const listPackages = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM subscription_packages WHERE is_active = 1 ORDER BY sort_order, id'
        );
        res.json(rows.map(r => {
            try { r.features = typeof r.features === 'string' ? JSON.parse(r.features) : r.features; } catch { r.features = []; }
            r.supports_whatsapp = !!r.supports_whatsapp;
            r.supports_api = !!r.supports_api;
            r.supports_portal = !!r.supports_portal;
            r.is_public = !!r.is_public;
            return r;
        }));
    } catch (err) { next(err); }
};

const createPackage = async (req, res, next) => {
    try {
        const {
            name, slug, description, price_monthly, price_yearly, max_users, max_leads,
            max_quotations, max_bookings, features, sort_order = 0,
            price_inr = 0, billing_cycle = 'monthly', storage_gb = 10,
            supports_whatsapp = false, supports_api = false, supports_portal = false, is_public = true
        } = req.body || {};

        if (!name?.trim()) return res.status(400).json({ error: 'Package name is required' });

        const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const finalPriceInr = price_inr || (billing_cycle === 'monthly' ? price_monthly : price_yearly) || 0;
        const finalPriceMonthly = price_monthly || (billing_cycle === 'monthly' ? finalPriceInr : Math.round(finalPriceInr / 12)) || 0;
        const finalPriceYearly = price_yearly || (billing_cycle === 'annual' ? finalPriceInr : finalPriceInr * 12) || 0;

        let finalFeatures = features;
        if (!finalFeatures) {
            finalFeatures = ['leads', 'quotations', 'bookings', 'dashboard', 'destinations', 'rates', 'payments', 'invoices', 'reviews', 'users', 'settings', 'reports'];
            if (supports_whatsapp) finalFeatures.push('whatsapp');
            if (supports_api) finalFeatures.push('api');
            if (supports_portal) finalFeatures.push('portal');
        }

        const [r] = await db.query(
            `INSERT INTO subscription_packages
                (name, slug, description, price_monthly, price_yearly, max_users, max_leads,
                 max_quotations, max_bookings, features, sort_order, price_inr, billing_cycle,
                 storage_gb, supports_whatsapp, supports_api, supports_portal, is_public)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [name.trim(), finalSlug, description || null, finalPriceMonthly, finalPriceYearly,
             max_users || 5, max_leads || 1000, max_quotations || 500, max_bookings || 200,
             finalFeatures ? JSON.stringify(finalFeatures) : null, sort_order, finalPriceInr, billing_cycle,
             storage_gb, supports_whatsapp ? 1 : 0, supports_api ? 1 : 0, supports_portal ? 1 : 0, is_public ? 1 : 0]
        );
        const [created] = await db.query('SELECT * FROM subscription_packages WHERE id = ?', [r.insertId]);
        res.status(201).json(created[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Package slug already exists' });
        next(err);
    }
};

const updatePackage = async (req, res, next) => {
    try {
        const id = req.params.id;

        if (req.body.price_inr !== undefined || req.body.billing_cycle !== undefined) {
            const billingCycle = req.body.billing_cycle || 'monthly';
            const priceInr = req.body.price_inr || 0;
            req.body.price_monthly = billingCycle === 'monthly' ? priceInr : Math.round(priceInr / 12);
            req.body.price_yearly = billingCycle === 'annual' ? priceInr : priceInr * 12;
        }

        if (req.body.supports_whatsapp !== undefined || req.body.supports_api !== undefined || req.body.supports_portal !== undefined) {
            const supportsWhatsapp = req.body.supports_whatsapp || false;
            const supportsApi = req.body.supports_api || false;
            const supportsPortal = req.body.supports_portal || false;
            const features = ['leads', 'quotations', 'bookings', 'dashboard', 'destinations', 'rates', 'payments', 'invoices', 'reviews', 'users', 'settings', 'reports'];
            if (supportsWhatsapp) features.push('whatsapp');
            if (supportsApi) features.push('api');
            if (supportsPortal) features.push('portal');
            req.body.features = features;
        }

        const allowed = ['name','slug','description','price_monthly','price_yearly','max_users',
                         'max_leads','max_quotations','max_bookings','features','is_active','sort_order',
                         'price_inr','billing_cycle','storage_gb','supports_whatsapp','supports_api','supports_portal','is_public'];
        const sets = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                sets.push(`${k} = ?`);
                params.push(k === 'features' ? JSON.stringify(req.body[k]) : req.body[k]);
            }
        }
        if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(id);
        await db.query(`UPDATE subscription_packages SET ${sets.join(', ')} WHERE id = ?`, params);
        const [rows] = await db.query('SELECT * FROM subscription_packages WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Package slug already exists' });
        next(err);
    }
};

// ── Company Payments (Super Admin Collections) ─────────────
// ── Company Payments (Super Admin Collections) ─────────────
const listCompanyPayments = async (req, res, next) => {
    try {
        const { company_id, status, page = 1, limit = 50 } = req.query;
        const where = [];
        const params = [];
        if (company_id) { where.push('cp.company_id = ?'); params.push(company_id); }
        if (status) {
            const dbStatus = status === 'completed' ? 'paid' : status;
            where.push('cp.status = ?');
            params.push(dbStatus);
        }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT cp.*, c.name AS company_name
               FROM company_payments cp
               JOIN companies c ON c.id = cp.company_id
               ${whereSql}
           ORDER BY cp.created_at DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM company_payments cp ${whereSql}`, params
        );

        const mapped = rows.map(r => {
            r.payment_method = r.gateway;
            if (r.status === 'paid') {
                r.status = 'completed';
            }
            return r;
        });

        res.json({ items: mapped, payments: mapped, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const createCompanyPayment = async (req, res, next) => {
    try {
        const { company_id, subscription_id, amount, gst_amount = 0, total_amount,
                payment_method = 'bank_transfer', gateway, status = 'completed', notes, transaction_id } = req.body || {};
        if (!company_id || !amount) {
            return res.status(400).json({ error: 'company_id and amount are required' });
        }

        const finalGateway = gateway || payment_method || 'bank_transfer';
        const finalTotal = total_amount || amount;
        const finalStatus = status === 'completed' ? 'paid' : status;

        const [r] = await db.query(
            `INSERT INTO company_payments
                (company_id, subscription_id, amount, gst_amount, total_amount, gateway, status, paid_at, notes, transaction_id)
             VALUES (?,?,?,?,?,?,?,NOW(),?,?)`,
            [company_id, subscription_id || null, amount, gst_amount, finalTotal, finalGateway, finalStatus, notes || null, transaction_id || null]
        );
        const [created] = await db.query('SELECT * FROM company_payments WHERE id = ?', [r.insertId]);
        res.status(201).json(created[0]);
    } catch (err) { next(err); }
};

// ── Company Invoices (Super Admin Billing) ─────────────────
const listCompanyInvoices = async (req, res, next) => {
    try {
        const { company_id, status, page = 1, limit = 50 } = req.query;
        const where = [];
        const params = [];
        if (company_id) { where.push('ci.company_id = ?'); params.push(company_id); }
        if (status) { where.push('ci.status = ?'); params.push(status); }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT ci.*, c.name AS company_name
               FROM company_invoices ci
               JOIN companies c ON c.id = ci.company_id
               ${whereSql}
           ORDER BY ci.created_at DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM company_invoices ci ${whereSql}`, params
        );
        res.json({ items: rows, invoices: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

const createCompanyInvoice = async (req, res, next) => {
    try {
        const { company_id, subscription_id, amount, gst_amount = 0, total_amount,
                due_date, notes, billing_period_start, billing_period_end } = req.body || {};
        
        const finalNotes = notes || req.body.description || null;
        const reqAmount = amount || total_amount;
        if (!company_id || !reqAmount || !due_date) {
            return res.status(400).json({ error: 'company_id, amount, and due_date are required' });
        }

        const finalTotal = total_amount || amount;
        const invoiceNumber = `SAAS-INV-${Date.now()}`;
        const [r] = await db.query(
            `INSERT INTO company_invoices
                (company_id, subscription_id, invoice_number, amount, gst_amount, total_amount,
                 due_date, status, billing_period_start, billing_period_end, notes)
             VALUES (?,?,?,?,?,?,?,'draft',?,?,?)`,
            [company_id, subscription_id || null, invoiceNumber, amount || total_amount, gst_amount, finalTotal,
             due_date, billing_period_start || null, billing_period_end || null, finalNotes]
        );
        const [created] = await db.query('SELECT * FROM company_invoices WHERE id = ?', [r.insertId]);
        res.status(201).json(created[0]);
    } catch (err) { next(err); }
};

const updateCompanyInvoice = async (req, res, next) => {
    try {
        const id = req.params.id;
        const allowed = ['status','paid_at','pdf_path','notes'];
        const sets = [];
        const params = [];
        for (const k of allowed) {
            if (req.body[k] !== undefined) { sets.push(`${k} = ?`); params.push(req.body[k]); }
        }
        if (!sets.length) return res.status(400).json({ error: 'No fields to update' });
        params.push(id);
        await db.query(`UPDATE company_invoices SET ${sets.join(', ')} WHERE id = ?`, params);
        const [rows] = await db.query('SELECT * FROM company_invoices WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (err) { next(err); }
};

// ── download PDF for company invoices ───────────────────────
const buildCompanyInvoicePdf = (inv, company) => {
    const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const fmt = (n) => 'INR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    const lines = [];
    const put = (text, x, yPos, opts = {}) => lines.push({ text, x, y: yPos, ...opts });
    const yStart = 770;
    let cursor = yStart;

    put('Tour CRM SaaS Platform', 50, cursor, { size: 20, bold: true });
    cursor -= 18;
    put('SaaS Platform Billings, Inc.', 50, cursor, { size: 9 });
    cursor -= 12;
    put('Email: billing@tourcrm.local', 50, cursor, { size: 9 });

    put('TAX INVOICE', 545, yStart, { size: 18, bold: true, align: 'right' });
    put(`Invoice #: ${inv.invoice_number}`, 545, yStart - 18, { size: 9, align: 'right' });
    put(`Issued: ${new Date(inv.created_at || new Date()).toLocaleDateString('en-IN')}`, 545, yStart - 30, { size: 9, align: 'right' });
    if (inv.due_date) {
        put(`Due Date: ${new Date(inv.due_date).toLocaleDateString('en-IN')}`, 545, yStart - 42, { size: 9, align: 'right' });
    }

    cursor -= 42;
    put('BILL TO (TENANT)', 50, cursor, { size: 9, bold: true });
    cursor -= 14;
    put(company.name, 50, cursor, { size: 11, bold: true });
    if (company.email) { cursor -= 12; put(`Email: ${company.email}`, 50, cursor, { size: 9 }); }
    if (company.phone) { cursor -= 12; put(`Phone: ${company.phone}`, 50, cursor, { size: 9 }); }
    if (company.address) { cursor -= 12; put(company.address, 50, cursor, { size: 9 }); }

    cursor -= 40;
    put('DESCRIPTION',  50, cursor, { size: 9, bold: true });
    put('AMOUNT',      545, cursor, { size: 9, bold: true, align: 'right' });
    cursor -= 4;
    put('________________________________________________________________________________', 50, cursor, { size: 9 });
    cursor -= 16;
    
    put(inv.notes || 'SaaS Subscription Plan', 50, cursor, { size: 10 });
    put(fmt(inv.amount), 545, cursor, { size: 10, align: 'right' });
    cursor -= 14;
    
    if (Number(inv.gst_amount) > 0) {
        put('Tax (GST)', 50, cursor, { size: 10 });
        put(fmt(inv.gst_amount), 545, cursor, { size: 10, align: 'right' });
        cursor -= 14;
    }
    
    put('________________________________________________________________________________', 50, cursor, { size: 9 });
    cursor -= 18;
    put('TOTAL', 50, cursor, { size: 12, bold: true });
    put(fmt(inv.total_amount), 545, cursor, { size: 12, bold: true, align: 'right' });
    cursor -= 28;

    put(`Status: ${inv.status.toUpperCase()}`, 50, cursor, { size: 10, bold: true });

    const stream = lines.map(l => {
        const font = l.bold ? '/F2' : '/F1';
        const size = l.size || 10;
        let xPos = l.x;
        if (l.align === 'right') {
            const w = (l.text || '').length * size * 0.5;
            xPos = l.x - w;
        }
        return `BT ${font} ${size} Tf ${xPos} ${l.y} Td (${esc(l.text)}) Tj ET`;
    }).join('\n');


    const objs = [];
    objs.push('<< /Type /Catalog /Pages 2 0 R >>');
    objs.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objs.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>');
    objs.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objs.forEach((obj, i) => {
        offsets.push(Buffer.byteLength(pdf, 'binary'));
        pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'binary');
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => {
        pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'binary');
};

const downloadCompanyInvoice = async (req, res, next) => {
    try {
        const id = req.params.id;
        const [invs] = await db.query('SELECT * FROM company_invoices WHERE id = ?', [id]);
        const inv = invs[0];
        if (!inv) return res.status(404).json({ error: 'Invoice not found' });

        const [comps] = await db.query('SELECT * FROM companies WHERE id = ?', [inv.company_id]);
        const company = comps[0];
        if (!company) return res.status(404).json({ error: 'Company not found' });

        const buf = buildCompanyInvoicePdf(inv, company);
        const fname = `${inv.invoice_number}.pdf`;
        const fpath = path.join(COMPANY_INVOICE_DIR, fname);
        try { fs.writeFileSync(fpath, buf); } catch (e) {}

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
        res.send(buf);
    } catch (err) { next(err); }
};

const downloadCompanyPaymentInvoice = async (req, res, next) => {
    try {
        const id = req.params.id;
        const [payments] = await db.query('SELECT * FROM company_payments WHERE id = ?', [id]);
        const payment = payments[0];
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        const [comps] = await db.query('SELECT * FROM companies WHERE id = ?', [payment.company_id]);
        const company = comps[0];
        if (!company) return res.status(404).json({ error: 'Company not found' });

        const fakeInvoice = {
            invoice_number: `PAY-${payment.id}`,
            created_at: payment.paid_at || payment.created_at,
            due_date: null,
            notes: payment.notes || `Payment Receipt (Method: ${payment.gateway || 'Bank Transfer'}${payment.transaction_id ? ', Txn: ' + payment.transaction_id : ''})`,
            amount: payment.amount,
            gst_amount: payment.gst_amount || 0,
            total_amount: payment.total_amount || payment.amount,
            status: payment.status === 'paid' ? 'PAID' : (payment.status === 'completed' ? 'PAID' : payment.status.toUpperCase())
        };

        const buf = buildCompanyInvoicePdf(fakeInvoice, company);
        const fname = `${fakeInvoice.invoice_number}.pdf`;
        const fpath = path.join(COMPANY_INVOICE_DIR, fname);
        try { fs.writeFileSync(fpath, buf); } catch (e) {}

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fname}"`);
        res.send(buf);
    } catch (err) { next(err); }
};

// ── Reports ──────────────────────────────────────────────────
const revenueReport = async (req, res, next) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        const [rows] = await db.query(
            `SELECT MONTH(created_at) AS month,
                    COALESCE(SUM(total_amount),0) AS revenue,
                    COUNT(*) AS payment_count
               FROM company_payments
              WHERE status = 'paid' AND YEAR(created_at) = ?
           GROUP BY MONTH(created_at)
           ORDER BY month`,
            [year]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

// ── Login Logs (agency staff logins) ─────────────────────────
const listLoginLogs = async (req, res, next) => {
    try {
        const { company_id, status, email, page = 1, limit = 50 } = req.query;
        const where = [];
        const params = [];
        if (company_id) { where.push('sll.company_id = ?'); params.push(company_id); }
        if (status) { where.push('sll.status = ?'); params.push(status); }
        if (email) { where.push('sll.email LIKE ?'); params.push(`%${email}%`); }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT sll.*, c.name AS company_name, su.full_name AS user_name
               FROM staff_login_logs sll
               LEFT JOIN companies c ON c.id = sll.company_id
               LEFT JOIN staff_users su ON su.id = sll.user_id
               ${whereSql}
           ORDER BY sll.created_at DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM staff_login_logs sll ${whereSql}`, params
        );
        res.json({ items: rows, login_logs: rows, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

// ── Activity Logs (audit_log with company filter) ────────────
const listActivityLogs = async (req, res, next) => {
    try {
        const { company_id, action, entity_type, user_id, page = 1, limit = 50 } = req.query;
        const where = [];
        const params = [];
        if (company_id) { where.push('al.company_id = ?'); params.push(company_id); }
        if (action) { where.push('al.action = ?'); params.push(action); }
        if (entity_type) { where.push('al.entity_type = ?'); params.push(entity_type); }
        if (user_id) { where.push('al.user_id = ?'); params.push(user_id); }
        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const lim = Math.max(1, Math.min(100, Number(limit)));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT al.*, c.name AS company_name, su.full_name AS user_name
               FROM audit_log al
               LEFT JOIN companies c ON c.id = al.company_id
               LEFT JOIN staff_users su ON su.id = al.user_id
               ${whereSql}
           ORDER BY al.created_at DESC
              LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM audit_log al ${whereSql}`, params
        );
        const items = rows.map(r => {
            try { r.old_data = typeof r.old_data === 'string' ? JSON.parse(r.old_data) : r.old_data; } catch { r.old_data = null; }
            try { r.new_data = typeof r.new_data === 'string' ? JSON.parse(r.new_data) : r.new_data; } catch { r.new_data = null; }
            return r;
        });
        res.json({ items, activity_logs: items, total: count[0].total, page: Number(page), limit: lim });
    } catch (err) { next(err); }
};

module.exports = {
    login,
    dashboardStats,
    listCompanies, getCompany, createCompany, updateCompany, toggleCompanyStatus,
    listPackages, createPackage, updatePackage,
    listCompanyPayments, createCompanyPayment, downloadCompanyPaymentInvoice,
    listCompanyInvoices, createCompanyInvoice, updateCompanyInvoice, downloadCompanyInvoice,
    revenueReport,
    listLoginLogs,
    listActivityLogs
};
