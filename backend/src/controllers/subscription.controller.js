const db = require('../config/db');

const listPublicPackages = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM subscription_packages WHERE is_active = 1 AND is_public = 1 ORDER BY sort_order, id'
        );
        const packages = rows.map((pkg) => {
            try { pkg.features = typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features; } catch { pkg.features = pkg.features; }
            pkg.supports_whatsapp = !!pkg.supports_whatsapp;
            pkg.supports_api = !!pkg.supports_api;
            pkg.supports_portal = !!pkg.supports_portal;
            return pkg;
        });
        res.json(packages);
    } catch (err) { next(err); }
};

module.exports = { listPublicPackages };
