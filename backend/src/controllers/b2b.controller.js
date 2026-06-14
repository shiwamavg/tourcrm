const db = require('../config/db');

async function listMarketplace(req, res) {
    const companyId = req.companyId;
    try {
        const [fixedDepartures] = await db.query(
            `SELECT fd.*, c.name as company_name 
             FROM fixed_departures fd 
             LEFT JOIN companies c ON fd.company_id = c.id 
             WHERE fd.is_b2b_shared = 1 AND fd.company_id != ?`,
            [companyId]
        );

        const [itineraries] = await db.query(
            `SELECT i.*, c.name as company_name 
             FROM itineraries i 
             LEFT JOIN companies c ON i.company_id = c.id 
             WHERE i.is_b2b_shared = 1 AND i.company_id != ?`,
            [companyId]
        );

        res.json({ fixedDepartures, itineraries });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function shareItem(req, res) {
    const companyId = req.companyId;
    const { type, id, share } = req.body;
    const isShared = share ? 1 : 0;

    if (!['departure', 'itinerary'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be departure or itinerary.' });
    }

    try {
        if (type === 'departure') {
            const [result] = await db.query(
                `UPDATE fixed_departures SET is_b2b_shared = ? WHERE id = ? AND company_id = ?`,
                [isShared, id, companyId]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Fixed departure not found or does not belong to your company.' });
            }
        } else {
            const [result] = await db.query(
                `UPDATE itineraries SET is_b2b_shared = ? WHERE id = ? AND company_id = ?`,
                [isShared, id, companyId]
            );
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Itinerary not found or does not belong to your company.' });
            }
        }

        res.json({ message: `Successfully ${share ? 'shared to' : 'removed from'} marketplace.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

async function importItem(req, res) {
    const companyId = req.companyId;
    const { type, id } = req.body;

    if (!['departure', 'itinerary'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be departure or itinerary.' });
    }

    try {
        if (type === 'departure') {
            const [rows] = await db.query(
                `SELECT * FROM fixed_departures WHERE id = ? AND is_b2b_shared = 1 AND company_id != ?`,
                [id, companyId]
            );
            if (!rows[0]) {
                return res.status(404).json({ error: 'Shared departure not found.' });
            }
            const src = rows[0];

            const [result] = await db.query(
                `INSERT INTO fixed_departures 
                 (company_id, title, destination, start_date, end_date, total_seats, booked_seats, price_per_person, currency, status, description, inclusions, exclusions, is_b2b_shared) 
                 VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0)`,
                [
                    companyId,
                    `[Imported] ${src.title}`,
                    src.destination,
                    src.start_date,
                    src.end_date,
                    src.total_seats,
                    src.price_per_person,
                    src.currency,
                    'open',
                    src.description,
                    src.inclusions,
                    src.exclusions
                ]
            );

            return res.status(201).json({ id: result.insertId, type: 'departure', message: 'Departure imported successfully.' });
        } else {
            const [rows] = await db.query(
                `SELECT * FROM itineraries WHERE id = ? AND is_b2b_shared = 1 AND company_id != ?`,
                [id, companyId]
            );
            if (!rows[0]) {
                return res.status(404).json({ error: 'Shared itinerary not found.' });
            }
            const src = rows[0];

            const [result] = await db.query(
                `INSERT INTO itineraries 
                 (company_id, title, start_date, end_date, total_days, destination_ids, status, notes, is_b2b_shared) 
                 VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, 0)`,
                [
                    companyId,
                    `[Imported] ${src.title}`,
                    src.start_date,
                    src.end_date,
                    src.total_days,
                    JSON.stringify(src.destination_ids || []),
                    src.notes
                ]
            );
            const newItineraryId = result.insertId;

            // Copy itinerary days
            const [days] = await db.query(
                `SELECT * FROM itinerary_days WHERE itinerary_id = ?`,
                [id]
            );

            for (const d of days) {
                await db.query(
                    `INSERT INTO itinerary_days 
                     (company_id, itinerary_id, day_number, date, title, description, hotel_id, meal_plan, transport_type, activities, notes) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        companyId,
                        newItineraryId,
                        d.day_number,
                        d.date,
                        d.title,
                        d.description,
                        d.hotel_id || null,
                        d.meal_plan,
                        d.transport_type,
                        JSON.stringify(d.activities || []),
                        d.notes
                    ]
                );
            }

            return res.status(201).json({ id: newItineraryId, type: 'itinerary', message: 'Itinerary imported successfully.' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = {
    listMarketplace,
    shareItem,
    importItem
};
