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

module.exports = {
    getSalesByAgent,
    getSalesByDestination,
    getLeadSources,
    getMonthlyRevenue
};
