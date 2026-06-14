const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query(
            `SELECT i.*, l.full_name as customer_name FROM itineraries i LEFT JOIN leads l ON i.customer_id = l.id WHERE i.company_id = ? ORDER BY i.created_at DESC`,
            [companyId]
        );
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { title, customer_id, quotation_id, booking_id, destination_ids, notes, is_active } = req.body;
    const createdBy = req.user?.id || null;
    try {
        const [result] = await db.query(
            `INSERT INTO itineraries (company_id, title, customer_id, quotation_id, booking_id, destination_ids, notes, is_active, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, title, customer_id || null, quotation_id || null, booking_id || null, JSON.stringify(destination_ids || []), notes, is_active !== undefined ? (is_active ? 1 : 0) : 1, createdBy]
        );
        res.status(201).json({ id: result.insertId, message: 'Itinerary created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { title, customer_id, quotation_id, booking_id, destination_ids, is_active, notes } = req.body;
    try {
        await db.query(
            `UPDATE itineraries SET title=?, customer_id=?, quotation_id=?, booking_id=?, destination_ids=?, is_active=?, notes=? WHERE id=? AND company_id=?`,
            [title, customer_id || null, quotation_id || null, booking_id || null, JSON.stringify(destination_ids || []), is_active !== undefined ? (is_active ? 1 : 0) : 1, notes, id, companyId]
        );
        res.json({ message: 'Itinerary updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function getById(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        const [[itinerary]] = await db.query(
            `SELECT i.*, l.full_name as customer_name FROM itineraries i LEFT JOIN leads l ON i.customer_id = l.id WHERE i.id=? AND i.company_id=?`,
            [id, companyId]
        );
        if (!itinerary) return res.status(404).json({ error: 'Not found' });
        const [days] = await db.query(
            `SELECT * FROM itinerary_days WHERE itinerary_id=? AND company_id=? ORDER BY day_number`,
            [id, companyId]
        );
        res.json({ ...itinerary, days });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function addDay(req, res) {
    const companyId = req.companyId;
    const itineraryId = req.params.id;
    const { day_number, date, title, description, hotel_id, meal_plan, transport_type, activities, notes } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO itinerary_days (company_id, itinerary_id, day_number, date, title, description, hotel_id, meal_plan, transport_type, activities, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, itineraryId, day_number, date || null, title, description, hotel_id || null, meal_plan, transport_type, JSON.stringify(activities || []), notes]
        );
        res.status(201).json({ id: result.insertId, message: 'Day added' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function updateDay(req, res) {
    const companyId = req.companyId;
    const { id, dayId } = req.params;
    const { day_number, date, title, description, hotel_id, meal_plan, transport_type, activities, notes } = req.body;
    try {
        await db.query(
            `UPDATE itinerary_days SET day_number=?, date=?, title=?, description=?, hotel_id=?, meal_plan=?, transport_type=?, activities=?, notes=? WHERE id=? AND itinerary_id=? AND company_id=?`,
            [day_number, date || null, title, description, hotel_id || null, meal_plan, transport_type, JSON.stringify(activities || []), notes, dayId, id, companyId]
        );
        res.json({ message: 'Day updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function removeDay(req, res) {
    const companyId = req.companyId;
    const { id, dayId } = req.params;
    try {
        await db.query('DELETE FROM itinerary_days WHERE id=? AND itinerary_id=? AND company_id=?', [dayId, id, companyId]);
        res.json({ message: 'Day removed' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM itinerary_days WHERE itinerary_id=? AND company_id=?', [id, companyId]);
        await db.query('DELETE FROM itineraries WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Itinerary deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, getById, addDay, updateDay, removeDay, remove };
