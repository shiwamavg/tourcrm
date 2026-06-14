// src/middleware/super-admin-auth.js
const jwt = require('jsonwebtoken');

// Use a separate secret for super admin (or same secret with a flag)
// For simplicity we reuse env.jwt.secret but check a different payload flag
const SUPER_ADMIN_SECRET = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev_secret_change_me';

const authenticateSuperAdmin = (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing authorization token' });

    try {
        const payload = jwt.verify(token, SUPER_ADMIN_SECRET);
        if (payload.type !== 'super_admin') {
            return res.status(403).json({ error: 'Not a super admin token' });
        }
        req.superAdmin = {
            id: payload.sub,
            email: payload.email,
            name: payload.name
        };
        return next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = { authenticateSuperAdmin };
