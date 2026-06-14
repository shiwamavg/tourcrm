// src/middleware/quota.js — Quota enforcement for SaaS tenants
const db = require('../config/db');

/**
 * Load company quota limits and current usage.
 * Returns { maxUsers, maxLeads, maxQuotations, maxBookings, maxInvoices, currentCounts }
 */
const getCompanyQuota = async (companyId) => {
    if (!companyId) return null;
    
    try {
        // Get company limits
        const [companies] = await db.query(
            'SELECT max_users, max_leads, max_quotations, max_bookings, max_invoices, max_visas, max_campaigns FROM companies WHERE id = ?',
            [companyId]
        );
        const company = companies[0];
        if (!company) return null;

        // Count current resources
        const queries = [
            db.query('SELECT COUNT(*) as cnt FROM staff_users WHERE company_id = ?', [companyId]),
            db.query('SELECT COUNT(*) as cnt FROM leads WHERE company_id = ?', [companyId]),
            db.query('SELECT COUNT(*) as cnt FROM quotations WHERE company_id = ?', [companyId]),
            db.query('SELECT COUNT(*) as cnt FROM bookings WHERE company_id = ?', [companyId]),
            db.query('SELECT COUNT(*) as cnt FROM invoices WHERE company_id = ?', [companyId]),
            db.query('SELECT COUNT(*) as cnt FROM visas WHERE company_id = ?', [companyId]),
            db.query('SELECT COUNT(*) as cnt FROM email_campaigns WHERE company_id = ?', [companyId])
        ];

        const [usersRes, leadsRes, quotesRes, bookingsRes, invoicesRes, visasRes, campaignsRes] = await Promise.all(queries);

        return {
            maxUsers: company.max_users || 999,
            maxLeads: company.max_leads || 999,
            maxQuotations: company.max_quotations || 999,
            maxBookings: company.max_bookings || 999,
            maxInvoices: company.max_invoices || 999,
            maxVisas: company.max_visas || 999,
            maxCampaigns: company.max_campaigns || 999,
            currentCounts: {
                users: usersRes[0][0]?.cnt || 0,
                leads: leadsRes[0][0]?.cnt || 0,
                quotations: quotesRes[0][0]?.cnt || 0,
                bookings: bookingsRes[0][0]?.cnt || 0,
                invoices: invoicesRes[0][0]?.cnt || 0,
                visas: visasRes[0][0]?.cnt || 0,
                campaigns: campaignsRes[0][0]?.cnt || 0
            }
        };
    } catch (err) {
        console.error('quota.js: error fetching quota', err);
        return null;
    }
};

/**
 * Middleware factory: enforce quota limit for a specific resource type.
 * @param {string} resourceType - 'users', 'leads', 'quotations', 'bookings', 'invoices'
 * @returns {Function} middleware function
 */
const checkQuota = (resourceType) => async (req, res, next) => {
    try {
        const companyId = req.user?.company_id;
        if (!companyId) return res.status(401).json({ error: 'No company context' });

        const quota = await getCompanyQuota(companyId);
        if (!quota) return res.status(400).json({ error: 'Company not found' });

        const maxKey = `max${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)}`;
        const maxCount = quota[maxKey];
        const currentCount = quota.currentCounts[resourceType];

        if (currentCount >= maxCount) {
            return res.status(429).json({
                error: `Quota exceeded: ${resourceType}`,
                quota: { max: maxCount, current: currentCount, remaining: 0 },
                message: `You have reached the limit of ${maxCount} ${resourceType} for your subscription. Please upgrade your plan.`
            });
        }

        // Attach quota info to request for logging/auditing
        req.quota = {
            resourceType,
            max: maxCount,
            current: currentCount,
            remaining: maxCount - currentCount - 1
        };

        next();
    } catch (err) {
        console.error(`quota middleware error for ${resourceType}:`, err);
        next(err);
    }
};

module.exports = { checkQuota, getCompanyQuota };
