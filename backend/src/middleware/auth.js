// src/middleware/auth.js — JWT auth + role-based access + company context
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const authenticate = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing authorization token' });

    try {
        const payload = jwt.verify(token, env.jwt.secret);
        req.user = {
            id: payload.sub,
            role: payload.role,
            email: payload.email,
            name: payload.name,
            company_id: payload.company_id || null
        };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    return next();
};

const authenticateAgent = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing authorization token' });

    try {
        const payload = jwt.verify(token, env.jwt.secret);
        if (payload.role !== 'agent') {
            return res.status(403).json({ error: 'Forbidden: not an agent account' });
        }
        req.agent = {
            id: payload.sub,
            email: payload.email,
            agency_name: payload.agency_name,
            company_id: payload.company_id || null
        };
        req.companyId = payload.company_id || null;
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { authenticate, requireRole, authenticateAgent };
