// src/controllers/packages.controller.js
const db = require('../config/db');

const sanitize = (s) => (s == null ? '' : String(s).trim());
const isEmail  = (s) => !s || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s).trim());
const isPhone  = (s) => !!s && /^[+\d][\d\s\-()]{5,20}$/.test(String(s).trim());

const mapPackageFields = (r) => {
    let current_price = Number(r.price);
    const booked = Number(r.booked_seats || 0);
    const remaining = r.max_participants === null ? null : Math.max(0, Number(r.max_participants) - booked);
    
    if (r.max_participants !== null && remaining !== null && r.price_surge_type !== 'none' && r.price_surge_threshold !== null && remaining <= r.price_surge_threshold) {
        if (r.price_surge_type === 'percentage') {
            current_price = Number(r.price) * (1 + Number(r.price_surge_amount) / 100);
        } else if (r.price_surge_type === 'fixed') {
            current_price = Number(r.price) + Number(r.price_surge_amount);
        }
    }
    
    if (typeof r.itinerary === 'string') { try { r.itinerary = JSON.parse(r.itinerary); } catch {} }
    if (typeof r.hotels === 'string') { try { r.hotels = JSON.parse(r.hotels); } catch {} }
    if (typeof r.cars === 'string') { try { r.cars = JSON.parse(r.cars); } catch {} }
    
    return {
        ...r,
        booked_seats: booked,
        remaining_seats: remaining,
        current_price
    };
};

// ── PUBLIC ENDPOINTS (No Auth, scoped by company_id) ─────────────────

const listPublic = async (req, res, next) => {
    try {
        const companyId = req.query.company_id || 1; // Default to company 1
        const [rows] = await db.query(
            `SELECT p.*, COALESCE(b.booked_seats, 0) AS booked_seats
               FROM packages p
          LEFT JOIN (
              SELECT package_id,
                     SUM(COALESCE(adults, 0) + COALESCE(children_below_5, 0) + COALESCE(children_above_5, 0)) AS booked_seats
                FROM bookings
               WHERE status != 'cancelled' AND package_id IS NOT NULL
               GROUP BY package_id
          ) b ON b.package_id = p.id
              WHERE p.company_id = ? AND p.is_active = 1
           ORDER BY p.id DESC`,
            [companyId]
        );
        res.json(rows.map(mapPackageFields));
    } catch (err) {
        next(err);
    }
};

const getPublicDetail = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, COALESCE(b.booked_seats, 0) AS booked_seats
               FROM packages p
          LEFT JOIN (
              SELECT package_id,
                     SUM(COALESCE(adults, 0) + COALESCE(children_below_5, 0) + COALESCE(children_above_5, 0)) AS booked_seats
                FROM bookings
               WHERE status != 'cancelled' AND package_id IS NOT NULL
               GROUP BY package_id
          ) b ON b.package_id = p.id
              WHERE p.id = ? AND p.is_active = 1`,
            [req.params.id]
        );
        const pkg = rows[0];
        if (!pkg) {
            return res.status(404).json({ error: 'Package not found or inactive' });
        }
        res.json(mapPackageFields(pkg));
    } catch (err) {
        next(err);
    }
};

const bookPackagePublic = async (req, res) => {
    try {
        const packageId = req.params.id;
        const { full_name, email, phone, travel_date, travellers, notes, ref_agent, ref_booking } = req.body || {};

        if (!sanitize(full_name)) return res.status(400).json({ error: 'Please tell us your name.' });
        if (!isPhone(phone))      return res.status(400).json({ error: 'Please provide a valid phone number.' });
        if (!sanitize(email) || !isEmail(email)) return res.status(400).json({ error: 'Please provide a valid email.' });

        // Retrieve package to get company_id, title, max_participants and booked count
        const [pkgs] = await db.query(`
            SELECT p.*,
                   COALESCE(b.booked_seats, 0) AS booked_seats
            FROM packages p
            LEFT JOIN (
                SELECT package_id,
                       SUM(COALESCE(adults, 0) + COALESCE(children_below_5, 0) + COALESCE(children_above_5, 0)) AS booked_seats
                FROM bookings
                WHERE status != 'cancelled' AND package_id = ?
                GROUP BY package_id
            ) b ON b.package_id = p.id
            WHERE p.id = ? AND p.is_active = 1
        `, [packageId, packageId]);

        const pkg = pkgs[0];
        if (!pkg) {
            return res.status(404).json({ error: 'Selected package is not available.' });
        }

        const bookedSeats = Number(pkg.booked_seats);
        const reqTravellers = Number(travellers) || 1;
        if (pkg.max_participants !== null) {
            const remaining = pkg.max_participants - bookedSeats;
            if (reqTravellers > remaining) {
                return res.status(400).json({ error: `Not enough seats available. Only ${remaining} seat(s) remaining.` });
            }
        }

        const targetCompanyId = pkg.company_id;

        // Resolve referral IDs
        let referrerAgentId = null;
        let referrerBookingId = null;

        if (ref_agent) {
            referrerAgentId = Number(ref_agent);
        }
        if (ref_booking) {
            const [bRows] = await db.query(
                'SELECT id FROM bookings WHERE booking_number = ? AND company_id = ? LIMIT 1',
                [String(ref_booking).trim(), targetCompanyId]
            );
            if (bRows[0]) {
                referrerBookingId = bRows[0].id;
            }
        }

        // Composed notes
        const composedNotes = [
            `Package Booked: ${pkg.title}`,
            travellers ? `Travellers: ${travellers}` : '',
            travel_date ? `Preferred start date: ${travel_date}` : '',
            notes ? sanitize(notes) : ''
        ].filter(Boolean).join(' · ');

        // Insert into leads
        const [ins] = await db.query(
            `INSERT INTO leads
                (full_name, email, phone, destination_text, package_id, agent_id, referrer_booking_id, source, status, notes, source_meta, company_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'website_form', 'new', ?, ?, ?)`,
            [
                sanitize(full_name),
                sanitize(email) || null,
                sanitize(phone),
                pkg.title,
                pkg.id,
                referrerAgentId,
                referrerBookingId,
                composedNotes,
                JSON.stringify({
                    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                    ua: req.headers['user-agent'] || null,
                    referer: req.headers['referer'] || null,
                    direct_package_booking: true
                }),
                targetCompanyId
            ]
        );

        // Log system milestone
        try {
            const { logFollowup } = require('../services/followup.service');
            await logFollowup(null, {
                company_id: targetCompanyId,
                lead_id: ins.insertId,
                user_id: 1, // System admin
                notes: `Lead created via direct package booking enquiry for: ${pkg.title}.`,
                is_system: 1
            });
        } catch (e) {
            console.error('Failed to log system milestone for package booking lead:', e.message);
        }

        // Start follow-up sequence
        const [created] = await db.query('SELECT * FROM leads WHERE id = ?', [ins.insertId]);
        try {
            const { startSequenceForLead } = require('./followup-sequence.controller');
            await startSequenceForLead(created[0]);
        } catch (e) {
            console.error('Failed to start follow-up sequence for public lead:', e.message);
        }

        res.status(201).json({
            ok: true,
            lead_id: ins.insertId,
            message: `Thank you! Your booking request for "${pkg.title}" has been received. Our team will get back to you shortly.`
        });
    } catch (err) {
        console.error('Package booking failed:', err.message);
        res.status(500).json({ error: 'Could not submit your booking request. Please try again later.' });
    }
};

// ── CRM ADMIN ENDPOINTS (Authenticated) ─────────────────────────────

const listAdmin = async (req, res, next) => {
    try {
        const { q, is_active, page = 1, limit = 50 } = req.query;
        const where = ['p.company_id = ?'];
        const params = [req.companyId];

        if (is_active !== undefined && is_active !== '') {
            where.push('p.is_active = ?');
            params.push(is_active === 'true' || is_active === '1' ? 1 : 0);
        }

        if (q) {
            where.push('(p.title LIKE ? OR p.description LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like);
        }

        const whereSql = 'WHERE ' + where.join(' AND ');
        const lim = Math.max(1, Number(limit));
        const offset = (Math.max(1, Number(page)) - 1) * lim;

        const [rows] = await db.query(
            `SELECT p.*, COALESCE(b.booked_seats, 0) AS booked_seats
               FROM packages p
          LEFT JOIN (
              SELECT package_id,
                     SUM(COALESCE(adults, 0) + COALESCE(children_below_5, 0) + COALESCE(children_above_5, 0)) AS booked_seats
                FROM bookings
               WHERE status != 'cancelled' AND package_id IS NOT NULL
               GROUP BY package_id
          ) b ON b.package_id = p.id
               ${whereSql}
           ORDER BY p.id DESC LIMIT ? OFFSET ?`,
            [...params, lim, offset]
        );

        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM packages p ${whereSql}`,
            params
        );

        res.json({
            items: rows.map(mapPackageFields),
            total: count[0].total,
            page: Number(page),
            limit: lim
        });
    } catch (err) {
        next(err);
    }
};

const createPackage = async (req, res, next) => {
    try {
        const {
            title, category, description, price = 0, duration_days = 1, duration_nights = 0, image_url,
            inclusions, exclusions, itinerary, hotels, cars,
            max_participants, referral_commission_type = 'percentage', referral_commission_rate = 0,
            price_surge_type = 'none', price_surge_threshold, price_surge_amount = 0
        } = req.body || {};

        if (!sanitize(title)) {
            return res.status(400).json({ error: 'Package title is required' });
        }

        const itineraryJson = itinerary ? (typeof itinerary === 'string' ? itinerary : JSON.stringify(itinerary)) : null;
        const hotelsJson = hotels ? (typeof hotels === 'string' ? hotels : JSON.stringify(hotels)) : null;
        const carsJson = cars ? (typeof cars === 'string' ? cars : JSON.stringify(cars)) : null;

        const [r] = await db.query(
            `INSERT INTO packages
                (company_id, title, category, description, price, max_participants,
                 referral_commission_type, referral_commission_rate, price_surge_type,
                 price_surge_threshold, price_surge_amount,
                 duration_days, duration_nights, image_url, inclusions, exclusions, itinerary, hotels, cars, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                req.companyId,
                sanitize(title),
                sanitize(category) || 'Individual / Family',
                sanitize(description) || null,
                Number(price),
                max_participants ? Number(max_participants) : null,
                referral_commission_type || 'percentage',
                Number(referral_commission_rate),
                price_surge_type || 'none',
                price_surge_threshold ? Number(price_surge_threshold) : null,
                Number(price_surge_amount),
                Number(duration_days),
                Number(duration_nights),
                sanitize(image_url) || null,
                sanitize(inclusions) || null,
                sanitize(exclusions) || null,
                itineraryJson,
                hotelsJson,
                carsJson
            ]
        );

        const [created] = await db.query('SELECT * FROM packages WHERE id = ? AND company_id = ?', [r.insertId, req.companyId]);
        res.status(201).json(mapPackageFields(created[0]));
    } catch (err) {
        next(err);
    }
};

const updatePackage = async (req, res, next) => {
    try {
        const id = req.params.id;
        const allowed = [
            'title', 'category', 'description', 'price', 'duration_days', 'duration_nights', 'image_url',
            'inclusions', 'exclusions', 'itinerary', 'hotels', 'cars', 'is_active',
            'max_participants', 'referral_commission_type', 'referral_commission_rate',
            'price_surge_type', 'price_surge_threshold', 'price_surge_amount'
        ];
        
        const sets = [];
        const params = [];

        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                sets.push(`${k} = ?`);
                if ((k === 'itinerary' || k === 'hotels' || k === 'cars') && typeof req.body[k] !== 'string') {
                    params.push(req.body[k] ? JSON.stringify(req.body[k]) : null);
                } else if (k === 'price' || k === 'duration_days' || k === 'duration_nights' || k === 'referral_commission_rate' || k === 'price_surge_amount') {
                    params.push(Number(req.body[k]));
                } else if (k === 'max_participants' || k === 'price_surge_threshold') {
                    params.push(req.body[k] ? Number(req.body[k]) : null);
                } else if (k === 'is_active') {
                    params.push(req.body[k] ? 1 : 0);
                } else {
                    params.push(req.body[k] || null);
                }
            }
        }

        if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

        params.push(id, req.companyId);

        const [r] = await db.query(
            `UPDATE packages SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
            params
        );

        if (!r.affectedRows) {
            return res.status(404).json({ error: 'Package not found' });
        }

        const [updated] = await db.query('SELECT * FROM packages WHERE id = ? AND company_id = ?', [id, req.companyId]);
        res.json(mapPackageFields(updated[0]));
    } catch (err) {
        next(err);
    }
};

const deletePackage = async (req, res, next) => {
    try {
        const id = req.params.id;
        const [r] = await db.query(
            'DELETE FROM packages WHERE id = ? AND company_id = ?',
            [id, req.companyId]
        );

        if (!r.affectedRows) {
            return res.status(404).json({ error: 'Package not found' });
        }

        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
};

const uploadImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    listPublic,
    getPublicDetail,
    bookPackagePublic,
    listAdmin,
    createPackage,
    updatePackage,
    deletePackage,
    uploadImage
};
