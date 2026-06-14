// src/controllers/monitor.controller.js
const db = require('../config/db');
const os = require('os');

const metrics = async (req, res, next) => {
    try {
        const [[companies]] = await db.query('SELECT COUNT(*) AS total FROM companies');
        const [[users]] = await db.query('SELECT COUNT(*) AS total FROM staff_users');
        const [[leads]] = await db.query('SELECT COUNT(*) AS total FROM leads');
        const [[quotations]] = await db.query('SELECT COUNT(*) AS total FROM quotations');
        const [[bookings]] = await db.query('SELECT COUNT(*) AS total FROM bookings');
        const [[activeSubs]] = await db.query("SELECT COUNT(*) AS total FROM companies WHERE subscription_status = 'active'");
        const [[trials]] = await db.query("SELECT COUNT(*) AS total FROM companies WHERE subscription_status = 'trial'");

        // 1. Get database table sizes
        const [tableSizes] = await db.query(`
            SELECT table_name AS \`table\`, 
                   round(((data_length + index_length) / 1024 / 1024), 2) AS \`size_mb\`, 
                   table_rows AS \`rows\` 
              FROM information_schema.TABLES 
             WHERE table_schema = DATABASE()
        `);

        // 2. CPU and Memory stats
        const memory = {
            freeBytes: os.freemem(),
            totalBytes: os.totalmem(),
            percentageUsed: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
            processRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
        };
        
        const cpu = {
            loadAvg: os.loadavg(),
            cores: os.cpus().length,
            uptimeSeconds: os.uptime()
        };

        // 3. Anomaly detection (last 24 hours)
        const [[recentSignups]] = await db.query(
            'SELECT COUNT(*) AS count FROM companies WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)'
        );
        const [[recentFailedPayments]] = await db.query(
            "SELECT COUNT(*) AS count FROM company_payments WHERE status = 'failed' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)"
        );

        const anomalies = {
            highSignupRate: (recentSignups.count || 0) > 10,
            highFailedPaymentsRate: (recentFailedPayments.count || 0) > 5,
            recentSignupCount: recentSignups.count || 0,
            recentFailedPaymentCount: recentFailedPayments.count || 0
        };

        res.json({
            ts: new Date().toISOString(),
            counts: {
                companies: Number(companies.total || 0),
                users: Number(users.total || 0),
                leads: Number(leads.total || 0),
                quotations: Number(quotations.total || 0),
                bookings: Number(bookings.total || 0),
                activeSubscriptions: Number(activeSubs.total || 0),
                activeTrials: Number(trials.total || 0)
            },
            database: {
                tables: tableSizes
            },
            system: {
                memory,
                cpu
            },
            anomalies
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { metrics };
