const db = require('../config/db');

async function getSalesByAgent(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT COALESCE(u.full_name, 'System') as agent_name, 
                    COUNT(b.id) as bookings_count, 
                    COALESCE(SUM(b.total_amount), 0) as total_sales
             FROM bookings b
             LEFT JOIN staff_users u ON b.created_by = u.id
             WHERE b.company_id = ? AND b.status != 'cancelled'
             GROUP BY b.created_by, u.full_name
             ORDER BY total_sales DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getSalesByDestination(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT COALESCE(destination_text, 'Unknown') as destination, 
                    COUNT(id) as bookings_count, 
                    COALESCE(SUM(total_amount), 0) as total_sales
             FROM bookings
             WHERE company_id = ? AND status != 'cancelled'
             GROUP BY destination_text
             ORDER BY total_sales DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getLeadSources(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT source, COUNT(id) as count
             FROM leads
             WHERE company_id = ?
             GROUP BY source
             ORDER BY count DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getMonthlyRevenue(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, 
                    COALESCE(SUM(total_amount), 0) as revenue
             FROM bookings
             WHERE company_id = ? AND status != 'cancelled'
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month ASC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getPackagePerformance(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT p.id as package_id,
                    p.title as package_title,
                    p.price as package_price,
                    (SELECT COUNT(*) FROM leads l WHERE l.package_id = p.id AND l.company_id = p.company_id) as leads_count,
                    (SELECT COUNT(*) FROM bookings b WHERE b.package_id = p.id AND b.company_id = p.company_id AND b.status != 'cancelled') as bookings_count,
                    (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b WHERE b.package_id = p.id AND b.company_id = p.company_id AND b.status != 'cancelled') as total_revenue
             FROM packages p
             WHERE p.company_id = ?
             ORDER BY total_revenue DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getPaymentsByGateway(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT gateway, 
                    COUNT(id) as transaction_count, 
                    COALESCE(SUM(amount), 0) as total_amount
             FROM payments
             WHERE company_id = ? AND status = 'paid'
             GROUP BY gateway
             ORDER BY total_amount DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getLeadConversionRate(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
                    COUNT(id) as total_leads,
                    SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_leads
             FROM leads
             WHERE company_id = ?
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month ASC`,
            [companyId]
        );
        const mapped = rows.map(r => ({
            month: r.month,
            total_leads: r.total_leads,
            converted_leads: r.converted_leads,
            conversion_rate: r.total_leads > 0 ? ((r.converted_leads / r.total_leads) * 100).toFixed(2) : '0.00'
        }));
        res.json(mapped);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function getOutstandingPayments(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT id, booking_number, customer_name, total_amount, amount_paid, (total_amount - amount_paid) as outstanding
             FROM bookings
             WHERE company_id = ? AND status != 'cancelled' AND total_amount > amount_paid
             ORDER BY outstanding DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = {
    getSalesByAgent,
    getSalesByDestination,
    getLeadSources,
    getMonthlyRevenue,
    getPackagePerformance,
    getPaymentsByGateway,
    getLeadConversionRate,
    getOutstandingPayments
};
