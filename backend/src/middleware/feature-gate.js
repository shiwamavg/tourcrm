// src/middleware/feature-gate.js — Universal feature gating for SaaS plans
const db = require('../config/db');

/**
 * Middleware factory: checks if the company has access to a specific feature.
 * @param {string} featureSlug - e.g. 'whatsapp', 'supplier', 'b2b', 'website', 'reports'
 * @returns {Function} middleware function
 */
const checkFeature = (featureSlug) => async (req, res, next) => {
    try {
        // If super admin, bypass
        if (req.user?.type === 'super_admin') {
            return next();
        }

        const companyId = req.companyId || req.user?.company_id;
        if (!companyId) return res.status(401).json({ error: 'No company context' });

        // Load company features
        const [companies] = await db.query(
            'SELECT features FROM companies WHERE id = ?',
            [companyId]
        );
        const company = companies[0];
        if (!company) return res.status(400).json({ error: 'Company not found' });

        let features = [];
        try {
            features = typeof company.features === 'string' ? JSON.parse(company.features) : (company.features || []);
        } catch {
            features = [];
        }

        if (!features.includes(featureSlug)) {
            return res.status(403).json({
                error: 'Feature locked',
                feature: featureSlug,
                message: `The '${featureSlug}' feature is not included in your subscription package. Please upgrade your plan in settings.`
            });
        }

        next();
    } catch (err) {
        console.error(`Feature gate middleware error for ${featureSlug}:`, err);
        next(err);
    }
};

module.exports = { checkFeature };
