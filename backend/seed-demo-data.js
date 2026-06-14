// seed-demo-data.js — populates new tables with realistic demo data
const db = require('./src/config/db');

const CO = 1; // company_id

async function run() {
    console.log('Seeding demo data...\n');

    // ── Suppliers ──────────────────────────────────────────────
    const suppliers = [
        { name: 'Mayfair Hotels & Resorts', type: 'hotel', contact_name: 'Rajiv Agarwal', contact_email: 'rajiv@mayfair.in', contact_phone: '+91-9832045678', city: 'Gangtok', country: 'India', commission_percent: 12 },
        { name: 'Elgin Hotels', type: 'hotel', contact_name: 'Sourav Dutta', contact_email: 'sourav@elginhotels.com', contact_phone: '+91-9434123456', city: 'Darjeeling', country: 'India', commission_percent: 15 },
        { name: 'Sikkim Holidays Transports', type: 'transport', contact_name: 'Passang Bhutia', contact_email: 'passang@sikkimholidays.com', contact_phone: '+91-9732178945', city: 'Gangtok', country: 'India', commission_percent: 10 },
        { name: 'Himalayan Eco Treks', type: 'activity', contact_name: 'Tashi Sherpa', contact_email: 'tashi@himalayanecotreks.com', contact_phone: '+91-9593215678', city: 'Yuksom', country: 'India', commission_percent: 20 },
        { name: 'Kanchenjunga Guides', type: 'guide', contact_name: 'Tenzing Lepcha', contact_email: 'tenzing@kanchenjungaguides.com', contact_phone: '+91-9876543210', city: 'Pelling', country: 'India', commission_percent: 18 },
        { name: 'The Tiffin Room', type: 'restaurant', contact_name: 'Mohan Thapa', contact_email: 'mohan@tiffinroom.com', contact_phone: '+91-9654321876', city: 'Gangtok', country: 'India', commission_percent: 8 },
        { name: 'Darjeeling Himalayan Railway', type: 'transport', contact_name: 'Amit Bose', contact_email: 'amit@dhr.in', contact_phone: '+91-9831012345', city: 'Darjeeling', country: 'India', commission_percent: 5 },
        { name: 'Lachung Homestay Collective', type: 'hotel', contact_name: 'Pema Lachungpa', contact_email: 'pema@lachunghomestays.com', contact_phone: '+91-9775412378', city: 'Lachung', country: 'India', commission_percent: 10 },
    ];
    for (const s of suppliers) {
        await db.query(
            `INSERT INTO suppliers (company_id, name, type, contact_name, contact_email, contact_phone, city, country, commission_percent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=name`,
            [CO, s.name, s.type, s.contact_name, s.contact_email, s.contact_phone, s.city, s.country, s.commission_percent]
        );
    }
    console.log(`✓ ${suppliers.length} suppliers`);

    // ── Tasks ──────────────────────────────────────────────────
    const tasks = [
        { title: 'Follow up with Rajesh Sharma', description: 'Call to confirm hotel preferences for Gangtok trip', assigned_to: 3, lead_id: 1, due_date: '2026-06-10 10:00:00', priority: 'high' },
        { title: 'Send quotation to Priya Thapa', description: 'Email the finalized 5-day Sikkim package quotation', assigned_to: 2, lead_id: 2, due_date: '2026-06-08 15:00:00', priority: 'high' },
        { title: 'Verify hotel availability for June 20', description: 'Check Mayfair Gangtok for family room availability', assigned_to: 1, due_date: '2026-06-07 12:00:00', priority: 'medium' },
        { title: 'Prepare invoice for Booking #2', description: 'Generate and email invoice for Rajesh Sharma booking', assigned_to: 4, booking_id: 2, due_date: '2026-06-09 17:00:00', priority: 'urgent' },
        { title: 'Update car rates for 2026 season', description: 'Get latest rates from Sikkim Holiday Transports and update in system', assigned_to: 1, due_date: '2026-06-15 18:00:00', priority: 'low' },
        { title: 'Review trekking guide assignments', description: 'Confirm Tashi Sherpa is available for Yuksom trek in July', assigned_to: 2, due_date: '2026-06-12 14:00:00', priority: 'medium' },
        { title: 'Follow up on Bhutan inquiry', description: 'Sandeep Chettri asked about Bhutan 5 days — send brochure', assigned_to: 3, lead_id: 5, due_date: '2026-06-11 11:00:00', priority: 'high' },
    ];
    for (const t of tasks) {
        await db.query(
            `INSERT INTO tasks (company_id, title, description, assigned_to, lead_id, booking_id, due_date, priority, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [CO, t.title, t.description, t.assigned_to, t.lead_id || null, t.booking_id || null, t.due_date, t.priority, 1]
        );
    }
    console.log(`✓ ${tasks.length} tasks`);

    // ── Travellers ─────────────────────────────────────────────
    const travellers = [
        { lead_id: 1, first_name: 'Rajesh', last_name: 'Sharma', email: 'rajesh.sharma@gmail.com', phone: '+91-9876543210', nationality: 'Indian', dietary_requirements: 'Vegetarian' },
        { lead_id: 1, first_name: 'Anita', last_name: 'Sharma', email: 'anita.sharma@gmail.com', phone: '+91-9876543211', nationality: 'Indian' },
        { lead_id: 2, first_name: 'Priya', last_name: 'Thapa', email: 'priya.thapa@yahoo.com', phone: '+91-9765432109', nationality: 'Indian', dietary_requirements: 'No spicy food' },
        { lead_id: 3, first_name: 'Amitabh', last_name: 'Banerjee', email: 'amitabh.b@gmail.com', phone: '+91-9654321098', passport_number: 'Z1234567', passport_expiry: '2028-08-15', nationality: 'Indian' },
        { lead_id: 3, first_name: 'Rina', last_name: 'Banerjee', email: 'rina.b@gmail.com', phone: '+91-9654321099', passport_number: 'Z1234568', passport_expiry: '2029-03-22', nationality: 'Indian' },
        { lead_id: 5, first_name: 'Sandeep', last_name: 'Chettri', email: 'sandeep.c@gmail.com', phone: '+91-9543210876', passport_number: 'B7654321', passport_expiry: '2027-11-30', nationality: 'Indian', emergency_contact_name: 'Maya Chettri', emergency_contact_phone: '+91-9543210877' },
    ];
    for (const t of travellers) {
        await db.query(
            `INSERT INTO travellers (company_id, lead_id, first_name, last_name, email, phone, nationality, dietary_requirements, passport_number, passport_expiry, emergency_contact_name, emergency_contact_phone)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [CO, t.lead_id, t.first_name, t.last_name, t.email, t.phone, t.nationality, t.dietary_requirements || null, t.passport_number || null, t.passport_expiry || null, t.emergency_contact_name || null, t.emergency_contact_phone || null]
        );
    }
    console.log(`✓ ${travellers.length} travellers`);

    // ── Itineraries + Days ────────────────────────────────────
    const [booking1] = await db.query('SELECT id FROM bookings WHERE company_id=? LIMIT 1', [CO]);
    const [lead2] = await db.query('SELECT id FROM leads WHERE company_id=? AND id=2', [CO]);

    if (booking1[0]) {
        await db.query(
            `INSERT INTO itineraries (company_id, title, booking_id, start_date, end_date, total_days, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [CO, 'Sikkim Delight — Priya Thapa', booking1[0].id, '2026-07-15', '2026-07-19', 5, 'confirmed', 'Darjeeling 2N + Gangtok 2N']
        );
        const [it] = await db.query('SELECT LAST_INSERT_ID() AS id');
        const days = [
            { day: 1, date: '2026-07-15', title: 'Arrival in Bagdogra → Darjeeling', description: 'Pickup from airport, drive to Darjeeling (3 hrs). Evening walk on Mall Road.', hotel_id: 2, meal_plan: 'Dinner only', transport_type: 'Private SUV' },
            { day: 2, date: '2026-07-16', title: 'Darjeeling Sightseeing', description: 'Sunrise at Tiger Hill, Batasia Loop, Ghoom Monastery, Himalayan Mountaineering Institute, Happy Valley Tea Estate.', hotel_id: 2, meal_plan: 'Breakfast + Dinner', transport_type: 'Private SUV' },
            { day: 3, date: '2026-07-17', title: 'Darjeeling → Gangtok', description: 'Drive to Gangtok (4 hrs). Check-in, evening leisure at MG Marg.', hotel_id: 1, meal_plan: 'Breakfast + Dinner', transport_type: 'Private SUV' },
            { day: 4, date: '2026-07-18', title: 'Gangtok — Tsomgo Lake Excursion', description: 'Full-day excursion to Tsomgo Lake (12,400 ft) and Baba Harbhajan Singh Mandir.', hotel_id: 1, meal_plan: 'Breakfast + Dinner', transport_type: 'Shared Jeep' },
            { day: 5, date: '2026-07-19', title: 'Departure', description: 'Breakfast, transfer to Bagdogra airport for flight.', meal_plan: 'Breakfast only', transport_type: 'Private SUV' },
        ];
        for (const d of days) {
            await db.query(
                `INSERT INTO itinerary_days (company_id, itinerary_id, day_number, date, title, description, hotel_id, meal_plan, transport_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [CO, it[0].id, d.day, d.date, d.title, d.description, d.hotel_id || null, d.meal_plan, d.transport_type]
            );
        }
        console.log('✓ 1 itinerary (5 days)');
    }

    // ── Fixed Departures ──────────────────────────────────────
    const departures = [
        { title: 'Monsoon Sikkim Escape', destination: 'Gangtok, Pelling, Darjeeling', start_date: '2026-08-05', end_date: '2026-08-10', total_seats: 20, price_per_person: 24999, description: '6-day monsoon special covering all major Sikkim and Darjeeling attractions.', inclusions: 'Accommodation, meals as per plan, transfers, sightseeing by private vehicle, all permits.', exclusions: 'Airfare, personal expenses, camera fees, tips.' },
        { title: 'North Sikkim Adventure', destination: 'Lachen, Gurudongmar Lake, Chopta Valley', start_date: '2026-10-01', end_date: '2026-10-07', total_seats: 15, price_per_person: 35999, description: '7-day offbeat adventure covering North Sikkim high-altitude lakes and valleys.', inclusions: 'Accommodation, meals, SUV transport, high-altitude permits, guide.', exclusions: 'Airfare, insurance, personal expenses.' },
        { title: 'Dzongri Trek — Rhododendron Trail', destination: 'Yuksom, Dzongri, Thashiding', start_date: '2026-04-15', end_date: '2026-04-22', total_seats: 12, price_per_person: 44999, description: 'Moderate-altitude spring trek through blooming rhododendron forests.', inclusions: 'Camping equipment, meals, guide, porters, permits.', exclusions: 'Sleeping bag, personal gear, insurance.' },
        { title: 'Pelling Weekend Special', destination: 'Pelling, Rimbi, Khecheopalri Lake', start_date: '2026-06-26', end_date: '2026-06-28', total_seats: 25, price_per_person: 12999, description: 'Quick weekend getaway to West Sikkim with monastery and lake visits.', inclusions: 'Accommodation, meals, transfers, guide.', exclusions: 'Airfare, personal expenses.' },
    ];
    for (const d of departures) {
        await db.query(
            `INSERT INTO fixed_departures (company_id, title, destination, start_date, end_date, total_seats, price_per_person, description, inclusions, exclusions, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [CO, d.title, d.destination, d.start_date, d.end_date, d.total_seats, d.price_per_person, d.description, d.inclusions, d.exclusions, 1]
        );
    }
    console.log(`✓ ${departures.length} fixed departures`);

    // ── Visas ──────────────────────────────────────────────────
    const visas = [
        { traveller_id: 4, visa_type: 'Tourist Visa', country: 'Bhutan', application_date: '2026-05-20', issue_date: '2026-05-25', expiry_date: '2026-08-25', status: 'approved', notes: 'For Bhutan 5 days trip — Sandeep Chettri' },
        { traveller_id: 5, visa_type: 'Tourist Visa', country: 'Bhutan', application_date: '2026-05-20', issue_date: '2026-05-25', expiry_date: '2026-08-25', status: 'approved', notes: 'Spouse visa — Rina Banerjee' },
    ];
    for (const v of visas) {
        await db.query(
            `INSERT INTO visas (company_id, traveller_id, visa_type, country, application_date, issue_date, expiry_date, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [CO, v.traveller_id, v.visa_type, v.country, v.application_date, v.issue_date, v.expiry_date, v.status, v.notes]
        );
    }
    console.log(`✓ ${visas.length} visa records`);

    // ── Reminders ──────────────────────────────────────────────
    const reminders = [
        { title: 'Rajesh Sharma — Payment Due', description: '50% advance payment due for confirmed booking', remind_at: '2026-06-20 09:00:00', entity_type: 'booking', entity_id: 2, channel: 'email' },
        { title: 'Call Sandeep about Bhutan feedback', description: 'Send Bhutan brochure and package options', remind_at: '2026-06-11 10:30:00', entity_type: 'lead', entity_id: 5, channel: 'in_app' },
        { title: 'Renew hotel contract — Mayfair', description: 'Annual rate contract renewal with Mayfair Gangtok', remind_at: '2026-07-01 11:00:00', entity_type: 'general', channel: 'email' },
        { title: 'Verify Pelling Weekend availability', description: 'Check hotel availability for June 26 trip before advertising', remind_at: '2026-06-15 14:00:00', entity_type: 'general', channel: 'in_app' },
    ];
    for (const r of reminders) {
        await db.query(
            `INSERT INTO reminders (company_id, title, description, remind_at, entity_type, entity_id, channel)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [CO, r.title, r.description, r.remind_at, r.entity_type, r.entity_id || null, r.channel]
        );
    }
    console.log(`✓ ${reminders.length} reminders`);

    // ── Currencies ─────────────────────────────────────────────
    const currencies = [
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchange_rate: 1.000000, is_default: 1 },
        { code: 'USD', name: 'US Dollar', symbol: '$', exchange_rate: 83.500000, is_default: 0 },
        { code: 'EUR', name: 'Euro', symbol: '€', exchange_rate: 90.200000, is_default: 0 },
        { code: 'GBP', name: 'British Pound', symbol: '£', exchange_rate: 105.800000, is_default: 0 },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', exchange_rate: 94.500000, is_default: 0 },
        { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', exchange_rate: 22.730000, is_default: 0 },
        { code: 'THB', name: 'Thai Baht', symbol: '฿', exchange_rate: 2.350000, is_default: 0 },
    ];
    for (const c of currencies) {
        await db.query(
            `INSERT INTO currencies (company_id, code, name, symbol, exchange_rate, is_default)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE exchange_rate=VALUES(exchange_rate)`,
            [CO, c.code, c.name, c.symbol, c.exchange_rate, c.is_default]
        );
    }
    console.log(`✓ ${currencies.length} currencies`);

    // ── WhatsApp Config ────────────────────────────────────────
    await db.query(
        `INSERT INTO whatsapp_configs (company_id, provider, phone_number, enabled, welcome_message)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE enabled=enabled`,
        [CO, 'twilio', '+91-8000012345', 1, 'Namaste! 👋 Welcome to Sikkim Trails Travel. How can we help you plan your Himalayan adventure? Reply with your name and destination to get started.']
    );
    console.log('✓ WhatsApp config');

    // ── Email Campaigns ────────────────────────────────────────
    const campaigns = [
        { name: 'Monsoon Special Offers', subject: '☔ Monsoon Magic — Up to 30% Off on Sikkim Packages', body_html: '<h1>Monsoon Magic Awaits!</h1><p>Enjoy the lush green hills of Sikkim this monsoon with exclusive discounts.</p>', status: 'draft' },
        { name: 'New Year Newsletter — Dec 2026', subject: '🎉 Plan Your 2027 with Sikkim Trails Travel', body_html: '<h1>Happy New Year!</h1><p>Explore our curated 2027 tour calendar featuring offbeat Himalayan destinations.</p>', status: 'draft' },
        { name: 'Customer Feedback Campaign', subject: 'How was your trip? Share your experience!', body_html: '<p>Dear customer, we hope you enjoyed your Sikkim journey. Please take a moment to share your feedback.</p>', status: 'draft' },
    ];
    for (const c of campaigns) {
        await db.query(
            `INSERT INTO email_campaigns (company_id, name, subject, body_html, body_text, status, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [CO, c.name, c.subject, c.body_html, c.body_html.replace(/<[^>]*>/g, ''), c.status, 1]
        );
    }
    console.log(`✓ ${campaigns.length} email campaigns`);

    // ── Landing Pages ──────────────────────────────────────────
    const pages = [
        { title: 'Monsoon Sikkim Special', slug: 'monsoon-sikkim-2026', meta_description: 'Explore Sikkim this monsoon with exclusive discounts on curated tour packages.', hero_title: 'Monsoon Magic in the Himalayas', hero_subtitle: 'Book your monsoon escape with up to 30% off on selected packages. Lush valleys, misty mountains, and unforgettable experiences await.', seo_keywords: 'monsoon sikkim tour, sikkim monsoon package, summer sikkim holiday, gangtok monsoon', is_published: 1 },
        { title: 'North Sikkim Adventure', slug: 'north-sikkim-adventure', meta_description: 'Offbeat adventure tours to North Sikkim — Gurudongmar Lake, Chopta Valley, and more.', hero_title: 'Conquer the High Himalayas', hero_subtitle: 'Experience North Sikkim\'s pristine beauty. High-altitude lakes, rare wildlife, and breathtaking landscapes.', seo_keywords: 'north sikkim tour, gurudongmar lake, lachung tour, chopta valley, high altitude trek', is_published: 0 },
        { title: 'Bhutan — Land of the Thunder Dragon', slug: 'bhutan-tour-packages', meta_description: 'Discover Bhutan with our curated tour packages — Paro, Thimphu, Punakha and more.', hero_title: 'Explore the Last Shangri-La', hero_subtitle: 'Immersive cultural tours to Bhutan. Monasteries, festivals, and Himalayan vistas.', seo_keywords: 'bhutan tour package, bhutan holiday, paro thimphu tour, bhutan travel', is_published: 0 },
    ];
    for (const p of pages) {
        await db.query(
            `INSERT INTO landing_pages (company_id, title, slug, meta_description, hero_title, hero_subtitle, seo_keywords, is_published)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE title=title`,
            [CO, p.title, p.slug, p.meta_description, p.hero_title, p.hero_subtitle, p.seo_keywords, p.is_published]
        );
    }
    console.log(`✓ ${pages.length} landing pages`);

    console.log('\n✅ All demo data seeded successfully!');
    await db.end();
}

run().catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
