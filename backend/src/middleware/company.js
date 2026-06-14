// src/middleware/company.js — multi-tenant company context extraction
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const extractCompany = async (req, res, next) => {
    if (req.path.startsWith('/api/super-admin')) return next();

    // If authenticate already ran, use req.user
    if (req.user && req.user.company_id) {
        req.companyId = req.user.company_id;
        return next();
    }

    // Otherwise decode the token to get company_id before auth verification
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
        try {
            const payload = jwt.decode(token);
            if (payload && payload.company_id) {
                req.companyId = payload.company_id;
                return next();
            }
        } catch {}
    }

    return next();
};

const checkCompanyStatus = async (req, res, next) => {
    if (req.path.startsWith('/api/super-admin')) return next();
    if (!req.companyId) return next(); // let auth middleware handle it first

    try {
        const [rows] = await db.query(
            'SELECT status, subscription_status, trial_ends_at, features FROM companies WHERE id = ?',
            [req.companyId]
        );
        if (!rows[0]) {
            return res.status(403).json({ error: 'Company not found' });
        }

        const company = rows[0];

        if (company.status === 'suspended') {
            return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
        }
        if (company.status === 'inactive') {
            return res.status(403).json({ error: 'Your account is inactive. Please contact support.' });
        }
        if (company.status === 'pending') {
            return res.status(403).json({ error: 'Your account is pending approval.' });
        }

        if (company.subscription_status === 'expired') {
            return res.status(403).json({ error: 'Your subscription has expired. Please renew to continue.' });
        }
        if (company.subscription_status === 'trial' && company.trial_ends_at && new Date(company.trial_ends_at) < new Date()) {
            return res.status(403).json({ error: 'Your trial has expired. Please subscribe to continue.' });
        }

        try {
            req.companyFeatures = typeof company.features === 'string'
                ? JSON.parse(company.features)
                : (company.features || []);
        } catch {
            req.companyFeatures = [];
        }

        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { extractCompany, checkCompanyStatus };
