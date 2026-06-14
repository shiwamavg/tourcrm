// src/middleware/validate.js — tiny Joi-like schema validator
// We avoid a Joi dependency for brevity; this covers what we need.
const validate = (schema) => (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
        const v = req.body?.[field];
        for (const r of rules) {
            if (r === 'required' && (v === undefined || v === null || v === '')) {
                errors.push(`${field} is required`);
            }
            if (r.startsWith('min:') && v != null) {
                const n = Number(r.slice(4));
                if (typeof v === 'number' && v < n) errors.push(`${field} must be >= ${n}`);
            }
            if (r.startsWith('max:') && v != null) {
                const n = Number(r.slice(4));
                if (typeof v === 'number' && v > n) errors.push(`${field} must be <= ${n}`);
            }
        }
    }
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
    next();
};

module.exports = { validate };
