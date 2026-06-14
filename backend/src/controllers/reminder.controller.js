const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const { status, priority, assigned_to, today } = req.query;
        let sql = `SELECT r.*, su.full_name AS assigned_name FROM reminders r LEFT JOIN staff_users su ON r.assigned_to = su.id AND su.company_id = r.company_id WHERE r.company_id = ?`;
        const params = [companyId];

        if (status) {
            if (status === 'pending_overdue') {
                sql += ' AND r.status = ? AND r.remind_at < NOW()';
                params.push('pending');
            } else {
                sql += ' AND r.status = ?';
                params.push(status);
            }
        }
        if (priority) { sql += ' AND r.priority = ?'; params.push(priority); }
        if (assigned_to) { sql += ' AND r.assigned_to = ?'; params.push(Number(assigned_to)); }
        if (today === '1') {
            sql += ' AND DATE(r.remind_at) = CURDATE()';
        }

        sql += ' ORDER BY r.remind_at ASC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { title, description, remind_at, entity_type, entity_id, channel, priority, followup_type, assigned_to } = req.body;
    const userId = req.user?.id || null;
    try {
        const [result] = await db.query(
            `INSERT INTO reminders (company_id, title, description, remind_at, entity_type, entity_id, user_id, assigned_to, channel, priority, followup_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, title, description, remind_at, entity_type || 'general', entity_id || null, userId, assigned_to || userId, channel || 'in_app', priority || 'medium', followup_type || 'general']
        );
        res.status(201).json({ id: result.insertId, message: 'Reminder created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { title, description, remind_at, entity_type, entity_id, channel, status, priority, followup_type, assigned_to } = req.body;
    try {
        await db.query(
            `UPDATE reminders SET title=?, description=?, remind_at=?, entity_type=?, entity_id=?, channel=?, status=?, priority=?, followup_type=?, assigned_to=? WHERE id=? AND company_id=?`,
            [title, description, remind_at, entity_type || 'general', entity_id || null, channel || 'in_app', status || 'pending', priority || 'medium', followup_type || 'general', assigned_to || null, id, companyId]
        );
        res.json({ message: 'Reminder updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function dismiss(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query(`UPDATE reminders SET status='dismissed' WHERE id=? AND company_id=?`, [id, companyId]);
        res.json({ message: 'Dismissed' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM reminders WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function stats(req, res) {
    const companyId = req.companyId;
    const userId = req.user?.id;
    try {
        const [[todayCount]] = await db.query(
            `SELECT COUNT(*) AS c FROM reminders WHERE company_id=? AND DATE(remind_at)=CURDATE() AND status='pending'`,
            [companyId]
        );
        const [[overdueCount]] = await db.query(
            `SELECT COUNT(*) AS c FROM reminders WHERE company_id=? AND remind_at<NOW() AND status='pending'`,
            [companyId]
        );
        const [[pendingCount]] = await db.query(
            `SELECT COUNT(*) AS c FROM reminders WHERE company_id=? AND status='pending'`,
            [companyId]
        );
        const [[myToday]] = await db.query(
            `SELECT COUNT(*) AS c FROM reminders WHERE company_id=? AND DATE(remind_at)=CURDATE() AND status='pending' AND assigned_to=?`,
            [companyId, userId]
        );
        const [todayList] = await db.query(
            `SELECT r.*, su.full_name AS assigned_name FROM reminders r LEFT JOIN staff_users su ON r.assigned_to = su.id AND su.company_id = r.company_id WHERE r.company_id=? AND DATE(r.remind_at)=CURDATE() AND r.status='pending' ORDER BY r.remind_at ASC LIMIT 10`,
            [companyId]
        );
        res.json({
            today: Number(todayCount[0].c),
            overdue: Number(overdueCount[0].c),
            pending: Number(pendingCount[0].c),
            myToday: Number(myToday[0].c),
            todayList
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, dismiss, remove, stats };
