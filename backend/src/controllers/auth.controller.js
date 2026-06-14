// src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const otp = require('../services/email-otp.service');

const signToken = (user) =>
    jwt.sign(
        { sub: user.id, role: user.role, email: user.email, name: user.full_name, company_id: user.company_id },
        env.jwt.secret,
        { expiresIn: env.jwt.expiresIn }
    );

const createSlug = (value) => {
    if (!value) return null;
    return value.toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const createTrialSubscription = async (companyId, packageId, startDate, endDate) => {
    if (!packageId) return null;
    const amount = 0;
    const gstAmount = 0;
    const totalAmount = 0;
    const status = 'active';
    const billingCycle = 'trial';
    const [result] = await db.query(
        `INSERT INTO company_subscriptions
            (company_id, package_id, billing_cycle, amount, gst_amount, total_amount, status, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [companyId, packageId, billingCycle, amount, gstAmount, totalAmount, status, startDate, endDate]
    );
    return result.insertId;
};

const signup = async (req, res, next) => {
    try {
        const {
            company_name, contact_name, contact_email, contact_phone,
            password, address, website, package_id
        } = req.body || {};

        if (!company_name?.trim() || !contact_name?.trim() || !contact_email?.trim() || !password) {
            return res.status(400).json({ error: 'company_name, contact_name, contact_email and password are required' });
        }

        const email = contact_email.trim().toLowerCase();
        const slug = createSlug(company_name) || `company-${Date.now()}`;
        const trialEndsAt = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 19).replace('T', ' ');

        let max_users = 5;
        let max_leads = 1000;
        let max_quotations = 500;
        let max_bookings = 200;
        let features = null;
        let subscription_package_id = null;
        let selectedPackage = null;

        if (package_id) {
            const [pkgs] = await db.query('SELECT * FROM subscription_packages WHERE id = ? AND is_active = 1', [package_id]);
            if (pkgs[0]) {
                selectedPackage = pkgs[0];
            }
        }
        if (!selectedPackage) {
            const [defaults] = await db.query('SELECT * FROM subscription_packages WHERE is_active = 1 AND is_public = 1 ORDER BY sort_order, id LIMIT 1');
            if (defaults[0]) selectedPackage = defaults[0];
        }
        if (selectedPackage) {
            subscription_package_id = selectedPackage.id;
            max_users = selectedPackage.max_users;
            max_leads = selectedPackage.max_leads;
            max_quotations = selectedPackage.max_quotations;
            max_bookings = selectedPackage.max_bookings;
            try { features = typeof selectedPackage.features === 'string' ? JSON.parse(selectedPackage.features) : selectedPackage.features; } catch { features = selectedPackage.features; }
        }

        const [companyResult] = await db.query(
            `INSERT INTO companies
                (name, slug, email, phone, address, website, status, subscription_status,
                 trial_ends_at, max_users, max_leads, max_quotations, max_bookings, features,
                 contact_name, contact_email, contact_phone, subscription_package_id, subscription_start_date)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', 'trial', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [company_name.trim(), slug, email, contact_phone || null, address || null, website || null,
             trialEndsAt, max_users, max_leads, max_quotations, max_bookings,
             features ? JSON.stringify(features) : null,
             contact_name.trim(), email, contact_phone || null, subscription_package_id]
        );

        const companyId = companyResult.insertId;
        const passwordHash = await bcrypt.hash(password, 10);
        const startDate = new Date().toISOString().slice(0, 10);

        if (subscription_package_id) {
            await createTrialSubscription(companyId, subscription_package_id, startDate, trialEndsAt.slice(0, 10));
        }

        await db.query(
            `INSERT INTO staff_users (company_id, full_name, email, phone, password_hash, role, is_active)
             VALUES (?, ?, ?, ?, ?, 'admin', 1)`,
            [companyId, contact_name.trim(), email, contact_phone || null, passwordHash]
        );

        const otpResult = await otp.issueOtp(email, { ip: req.ip, userAgent: req.get('user-agent') });

        const response = {
            id: companyId,
            name: company_name.trim(),
            slug,
            status: 'pending',
            subscription_status: 'trial',
            trial_ends_at: trialEndsAt,
            package_id: subscription_package_id,
            verification_email_sent: true
        };
        if ((process.env.EMAIL_MODE || 'console') === 'console' || process.env.NODE_ENV === 'test') {
            response.dev_otp = otpResult.code;
        }

        res.status(201).json(response);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Company name or contact email already exists' });
        }
        next(err);
    }
};

const verifySignupOtp = async (req, res, next) => {
    try {
        const { email, code } = req.body || {};
        if (!email || !code) return res.status(400).json({ error: 'email and code are required' });

        const result = await otp.verifyOtp(email.trim().toLowerCase(), code);
        if (!result.ok) {
            const code_ = { no_active_otp: 400, expired: 400, wrong_code: 401,
                            too_many_attempts: 429, invalid_code_format: 400 }[result.reason] || 400;
            return res.status(code_).json({ error: result.reason });
        }

        let updated = false;
        try {
            const [updateResult] = await db.query(
                `UPDATE companies
                    SET email_verified_at = NOW()
                  WHERE contact_email = ? AND status = 'pending'
                  ORDER BY id DESC
                  LIMIT 1`,
                [result.email]
            );
            updated = updateResult.affectedRows > 0;
        } catch (err) {
            if (err.code !== 'ER_BAD_FIELD_ERROR') throw err;
        }

        if (!updated) {
            const [rows] = await db.query(
                `SELECT id FROM companies WHERE contact_email = ? AND status = 'pending' ORDER BY id DESC LIMIT 1`,
                [result.email]
            );
            if (!rows[0]) {
                return res.status(404).json({ error: 'Pending signup not found for this email' });
            }
        }

        res.json({ ok: true, email: result.email, verified_at: new Date().toISOString() });
    } catch (err) {
        next(err);
    }
};

const resendSignupOtp = async (req, res, next) => {
    try {
        const { email } = req.body || {};
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'A valid email is required' });
        }
        const normalizedEmail = email.trim().toLowerCase();

        const [rows] = await db.query(
            `SELECT id FROM companies WHERE contact_email = ? AND status = 'pending' ORDER BY id DESC LIMIT 1`,
            [normalizedEmail]
        );
        if (!rows[0]) {
            return res.status(404).json({ error: 'Pending signup not found for this email' });
        }

        const otpResult = await otp.issueOtp(normalizedEmail, { ip: req.ip, userAgent: req.get('user-agent') });
        const response = { ok: true, message: 'Verification code resent' };
        if ((process.env.EMAIL_MODE || 'console') === 'console' || process.env.NODE_ENV === 'test') {
            response.dev_otp = otpResult.code;
        }
        res.json(response);
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const [rows] = await db.query(
            `SELECT su.id, su.full_name, su.email, su.role, su.password_hash, su.is_active, su.company_id,
                    c.name AS company_name, c.status AS company_status, c.subscription_status
               FROM staff_users su
               JOIN companies c ON c.id = su.company_id
              WHERE su.email = ? LIMIT 1`,
            [email]
        );
        const user = rows[0];
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (user.company_status === 'pending') {
            return res.status(403).json({ error: 'Your account is pending approval. Please wait for activation.' });
        }
        if (user.company_status === 'suspended') {
            return res.status(403).json({ error: 'Your company account has been suspended. Please contact support.' });
        }
        if (user.company_status === 'inactive') {
            return res.status(403).json({ error: 'Your company account is inactive. Please contact support.' });
        }

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        await db.query('UPDATE staff_users SET last_login_at = NOW() WHERE id = ?', [user.id]);
        const token = signToken(user);
        res.json({
            access_token: token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                company_id: user.company_id,
                company_name: user.company_name,
                subscription_status: user.subscription_status
            }
        });
    } catch (err) { next(err); }
};

const me = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT su.id, su.full_name, su.email, su.phone, su.role, su.last_login_at, su.company_id,
                    c.name AS company_name, c.status AS company_status, c.subscription_status,
                    c.max_users, c.max_leads, c.max_quotations, c.max_bookings, c.features
               FROM staff_users su
               JOIN companies c ON c.id = su.company_id
              WHERE su.id = ?`,
            [req.user.id]
        );
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        const u = rows[0];
        try {
            u.features = typeof u.features === 'string' ? JSON.parse(u.features) : (u.features || []);
        } catch { u.features = []; }
        res.json(u);
    } catch (err) { next(err); }
};

module.exports = { login, signup, verifySignupOtp, resendSignupOtp, me };
