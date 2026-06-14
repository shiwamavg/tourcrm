const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT t.*, l.full_name as lead_name FROM travellers t LEFT JOIN leads l ON t.lead_id = l.id WHERE t.company_id = ? ORDER BY t.created_at DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { lead_id, booking_id, first_name, last_name, email, phone, date_of_birth, gender, passport_number, passport_expiry, nationality, dietary_requirements, medical_notes, emergency_contact_name, emergency_contact_phone } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO travellers (company_id, lead_id, booking_id, first_name, last_name, email, phone, date_of_birth, gender, passport_number, passport_expiry, nationality, dietary_requirements, medical_notes, emergency_contact_name, emergency_contact_phone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, lead_id || null, booking_id || null, first_name, last_name, email, phone, date_of_birth || null, gender || null, passport_number, passport_expiry || null, nationality, dietary_requirements, medical_notes, emergency_contact_name, emergency_contact_phone]
        );
        res.status(201).json({ id: result.insertId, message: 'Traveller created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { lead_id, booking_id, first_name, last_name, email, phone, date_of_birth, gender, passport_number, passport_expiry, nationality, dietary_requirements, medical_notes, emergency_contact_name, emergency_contact_phone } = req.body;
    try {
        await db.query(
            `UPDATE travellers SET lead_id=?, booking_id=?, first_name=?, last_name=?, email=?, phone=?, date_of_birth=?, gender=?, passport_number=?, passport_expiry=?, nationality=?, dietary_requirements=?, medical_notes=?, emergency_contact_name=?, emergency_contact_phone=? WHERE id=? AND company_id=?`,
            [lead_id || null, booking_id || null, first_name, last_name, email, phone, date_of_birth || null, gender || null, passport_number, passport_expiry || null, nationality, dietary_requirements, medical_notes, emergency_contact_name, emergency_contact_phone, id, companyId]
        );
        res.json({ message: 'Traveller updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM travellers WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Traveller deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, remove };
