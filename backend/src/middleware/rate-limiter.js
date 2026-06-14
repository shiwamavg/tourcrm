// src/middleware/rate-limiter.js — Memory-based rate limiter enforcing plan quotas
const db = require('../config/db');

// In-memory bucket store
// Key: tenantId or IP address
// Value: { count, resetTime }
const store = new Map();

// Periodic cleanup task (runs every 60s)
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
        if (record.resetTime <= now) {
            store.delete(key);
        }
    }
}, 60000);

const getLimitByTier = (tier) => {
    switch (tier?.toLowerCase()) {
        case 'starter':
            return { limit: 60, windowMs: 60000 }; // 60 requests/minute
        case 'professional':
            return { limit: 180, windowMs: 60000 }; // 180 requests/minute
        case 'enterprise':
            return { limit: 600, windowMs: 60000 }; // 600 requests/minute
        default:
            return { limit: 30, windowMs: 60000 }; // 30 requests/minute (unsubscribed/public)
    }
};

const rateLimiter = async (req, res, next) => {
    try {
        // Bypass for super admin
        if (req.user?.role === 'super_admin' || req.user?.type === 'super_admin' || req.path.startsWith('/api/super-admin')) {
            return next();
        }

        const companyId = req.companyId || req.user?.company_id;
        const key = companyId ? `tenant:${companyId}` : `ip:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;

        let tier = 'public';
        if (companyId) {
            // Check cache or database
            const [companies] = await db.query(
                `SELECT sp.slug FROM companies c
              LEFT JOIN subscription_packages sp ON sp.id = c.subscription_package_id
                  WHERE c.id = ?`,
                [companyId]
            );
            if (companies[0] && companies[0].slug) {
                tier = companies[0].slug;
            }
        }

        const { limit, windowMs } = getLimitByTier(tier);
        const now = Date.now();

        let record = store.get(key);
        if (!record || record.resetTime <= now) {
            record = {
                count: 0,
                resetTime: now + windowMs
            };
        }

        record.count++;
        store.set(key, record);

        // Set standard rate limit headers
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count));
        res.setHeader('X-RateLimit-Reset', Math.round(record.resetTime / 1000));

        if (record.count > limit) {
            return res.status(429).json({
                error: 'Too Many Requests',
                tier: tier,
                message: `You have exceeded your request quota of ${limit} requests per minute for the '${tier}' plan. Please slow down or upgrade your plan.`
            });
        }

        next();
    } catch (err) {
        console.error('Rate limit middleware error:', err);
        next(); // fail-open: allow request to proceed if middleware errors out
    }
};

module.exports = rateLimiter;
