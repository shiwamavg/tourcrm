const db = require('../config/db');

async function usage(req, res) {
    const companyId = req.companyId;
    try {
        const [[company]] = await db.query(
            'SELECT max_users, max_leads, max_quotations, max_bookings, features FROM companies WHERE id=?',
            [companyId]
        );
        if (!company) return res.status(404).json({ error: 'Company not found' });

        const [[counts]] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM staff_users WHERE company_id=? AND is_active=1) as user_count,
                (SELECT COUNT(*) FROM leads WHERE company_id=?) as lead_count,
                (SELECT COUNT(*) FROM quotations WHERE company_id=?) as quotation_count,
                (SELECT COUNT(*) FROM bookings WHERE company_id=?) as booking_count
        `, [companyId, companyId, companyId, companyId]);

        res.json({
            limits: {
                users: company.max_users,
                leads: company.max_leads,
                quotations: company.max_quotations,
                bookings: company.max_bookings,
                storage_gb: 0
            },
            usage: {
                users: counts.user_count,
                leads: counts.lead_count,
                quotations: counts.quotation_count,
                bookings: counts.booking_count
            },
            features: company.features
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { usage };
