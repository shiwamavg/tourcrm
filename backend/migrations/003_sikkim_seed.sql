-- =============================================================
-- Seed 003: Tour-package destinations
-- Agency: Sikkim Trails Travel
-- Destinations are now tour packages (groups of places), not individual locations
-- e.g. "Sikkim Darjeeling Tour" = Gangtok + Darjeeling
-- =============================================================

USE tour_crm;

-- ── Wipe generic seed data, keep staff_users + agency_settings ──
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE quotation_misc;
TRUNCATE TABLE quotation_flights;
TRUNCATE TABLE quotation_cars;
TRUNCATE TABLE quotation_hotels;
TRUNCATE TABLE quotation_versions;
TRUNCATE TABLE bookings;
TRUNCATE TABLE quotations;
TRUNCATE TABLE leads;
TRUNCATE TABLE car_rates;
TRUNCATE TABLE hotel_rates;
TRUNCATE TABLE car_types;
TRUNCATE TABLE destinations;
SET FOREIGN_KEY_CHECKS = 1;

-- ── Update agency name ────────────────────────────────────────
UPDATE agency_settings
   SET agency_name = 'Sikkim Trails Travel',
       address     = 'M.G. Marg, Gangtok, East Sikkim 737101',
       phone       = '+91 98765 43210',
       email       = 'bookings@sikkimtrails.in',
       website     = 'https://sikkimtrails.in',
       gstin       = '11AAAAA0000A1Z5',
       default_markup_pct = 12.00,
       default_gst_pct    = 5.00,
       default_booking_fee_pct = 25.00
 LIMIT 1;

-- ── Destinations (tour packages — groups of places) ──────────
INSERT INTO destinations (name, state, country) VALUES
    ('Sikkim Darjeeling Tour',              'Sikkim / West Bengal', 'India'),
    ('North Sikkim Explorer',               'Sikkim',               'India'),
    ('Darjeeling + Mirik + Kurseong Tour',  'West Bengal',          'India'),
    ('Sikkim Panorama',                     'Sikkim',               'India'),
    ('South Sikkim Retreat',                'Sikkim',               'India'),
    ('Bhutan Getaway',                      'Bhutan',               'Bhutan'),
    ('Nepal Himalayan Tour',                'Nepal',                'Nepal'),
    ('Darjeeling Kalimpong Tour',           'West Bengal',          'India'),
    ('Sikkim Odyssey',                      'Sikkim',               'India'),
    ('Eastern Himalaya Special',            'Sikkim / West Bengal', 'India'),
    ('Sikkim Family Special',               'Sikkim',               'India'),
    ('Darjeeling Weekend Getaway',          'West Bengal',          'India'),
    ('Gangtok + Tsomgo Lake Tour',          'Sikkim',               'India'),
    ('Sikkim Honeymoon Special',            'Sikkim',               'India'),
    ('Bhutan + Nepal Combo',                'Bhutan / Nepal',       'Multi'),
    ('Sikkim Birding & Nature Trail',       'Sikkim',               'India'),
    ('Darjeeling Tea Garden Tour',          'West Bengal',          'India'),
    ('Gangtok City Break',                  'Sikkim',               'India');

-- Capture tour-package destination IDs
SET @d_sikkim_darjeeling   = (SELECT id FROM destinations WHERE name='Sikkim Darjeeling Tour');
SET @d_north_sikkim        = (SELECT id FROM destinations WHERE name='North Sikkim Explorer');
SET @d_dar_mirik_kurseong  = (SELECT id FROM destinations WHERE name='Darjeeling + Mirik + Kurseong Tour');
SET @d_sikkim_panorama     = (SELECT id FROM destinations WHERE name='Sikkim Panorama');
SET @d_south_sikkim        = (SELECT id FROM destinations WHERE name='South Sikkim Retreat');
SET @d_bhutan_getaway      = (SELECT id FROM destinations WHERE name='Bhutan Getaway');
SET @d_nepal_tour          = (SELECT id FROM destinations WHERE name='Nepal Himalayan Tour');
SET @d_darjeeling_kalimpong = (SELECT id FROM destinations WHERE name='Darjeeling Kalimpong Tour');
SET @d_sikkim_odyssey      = (SELECT id FROM destinations WHERE name='Sikkim Odyssey');
SET @d_eastern_himalaya    = (SELECT id FROM destinations WHERE name='Eastern Himalaya Special');
SET @d_sikkim_family       = (SELECT id FROM destinations WHERE name='Sikkim Family Special');
SET @d_darjeeling_weekend  = (SELECT id FROM destinations WHERE name='Darjeeling Weekend Getaway');
SET @d_tsomgo_tour         = (SELECT id FROM destinations WHERE name='Gangtok + Tsomgo Lake Tour');
SET @d_sikkim_honeymoon    = (SELECT id FROM destinations WHERE name='Sikkim Honeymoon Special');
SET @d_bhutan_nepal        = (SELECT id FROM destinations WHERE name='Bhutan + Nepal Combo');
SET @d_sikkim_birding      = (SELECT id FROM destinations WHERE name='Sikkim Birding & Nature Trail');
SET @d_tea_garden          = (SELECT id FROM destinations WHERE name='Darjeeling Tea Garden Tour');
SET @d_gangtok_city        = (SELECT id FROM destinations WHERE name='Gangtok City Break');

-- ── Car types (Sikkim terrain friendly) ──────────────────────
INSERT INTO car_types (name, capacity) VALUES
    ('Sedan (Dzire / Etios)',      4),
    ('SUV (Innova / Scorpio)',     6),
    ('Innova Crysta',              7),
    ('Tempo Traveller (12 Seater)', 12),
    ('Tempo Traveller (17 Seater)', 17),
    ('Bolero / Sumo (Hill Spec)',  6),
    ('Toyota Hilux (4x4)',         6),
    ('Mini Bus (20 Seater)',       20);

-- Capture car type IDs
SET @ct_sedan    = (SELECT id FROM car_types WHERE name='Sedan (Dzire / Etios)');
SET @ct_suv      = (SELECT id FROM car_types WHERE name='SUV (Innova / Scorpio)');
SET @ct_innova   = (SELECT id FROM car_types WHERE name='Innova Crysta');
SET @ct_tt12     = (SELECT id FROM car_types WHERE name='Tempo Traveller (12 Seater)');
SET @ct_tt17     = (SELECT id FROM car_types WHERE name='Tempo Traveller (17 Seater)');
SET @ct_bolero   = (SELECT id FROM car_types WHERE name='Bolero / Sumo (Hill Spec)');
SET @ct_hilux    = (SELECT id FROM car_types WHERE name='Toyota Hilux (4x4)');
SET @ct_minibus  = (SELECT id FROM car_types WHERE name='Mini Bus (20 Seater)');

-- ── Hotel rates (sample for key tour-package destinations) ─────
-- SIKKIM DARJEELING TOUR (Gangtok + Darjeeling hotels)
INSERT INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, notes) VALUES
    (@d_sikkim_darjeeling, 'Mayfair Spa Resort & Casino',  '5', 'luxury',  'breakfast_dinner', 14500, 'Top-end, MG Marg view'),
    (@d_sikkim_darjeeling, 'Hotel Mount Siniolchu',        '4', 'premium', 'breakfast',         5800, 'Central Gangtok, great views'),
    (@d_sikkim_darjeeling, 'Summit Denzong Hotel & Spa',   '4', 'premium', 'breakfast',         5200, 'Near MG Marg'),
    (@d_sikkim_darjeeling, 'The Elgin Darjeeling',         '4', 'premium', 'breakfast',         6800, 'Heritage, Mall Road'),
    (@d_sikkim_darjeeling, 'Cedar Inn',                     '3', 'deluxe',  'breakfast',         3600, 'Observatory Hill view'),

    -- SIKKIM FAMILY SPECIAL
    (@d_sikkim_family, 'Hotel Mount Siniolchu',            '4', 'premium', 'breakfast',         5800, 'Central Gangtok'),
    (@d_sikkim_family, 'Yumthang Valley Resort',           '3', 'deluxe',  'breakfast_dinner',  3800, 'Lachung, hot water'),
    (@d_sikkim_family, 'The Elgin Mount Pandim',           '4', 'premium', 'breakfast',         6200, 'Best in Pelling'),

    -- NORTH SIKKIM EXPLORER
    (@d_north_sikkim, 'Yumthang Valley Resort',            '3', 'deluxe',  'breakfast_dinner',  3800, 'Lachung, hot water'),
    (@d_north_sikkim, 'Snow Lion House',                   '2', 'standard','breakfast_dinner',  2400, 'Lachen, basic'),

    -- DARJEELING + MIRIK + KURSEONG
    (@d_dar_mirik_kurseong, 'Cedar Inn',                   '3', 'deluxe',  'breakfast',         3600, 'Darjeeling, Observatory Hill'),
    (@d_dar_mirik_kurseong, 'Lake Sumendu Hotel',          '3', 'deluxe',  'breakfast',         2600, 'Mirik, lake view'),
    (@d_dar_mirik_kurseong, 'Cochrane Place',              '3', 'deluxe',  'breakfast',         3400, 'Kurseong, tea estate'),

    -- BHUTAN GETAWAY
    (@d_bhutan_getaway, 'Hotel Taj Tashi Thimphu',         '5', 'luxury',  'breakfast_dinner',  9800, 'Taj in Thimphu'),
    (@d_bhutan_getaway, 'Le Meridien Paro Riverfront',     '5', 'luxury',  'breakfast_dinner', 11500, 'Top-end Paro'),

    -- NEPAL HIMALAYAN TOUR
    (@d_nepal_tour, 'Hyatt Regency Kathmandu',             '5', 'luxury',  'breakfast',         9500, 'Top-end Boudha'),
    (@d_nepal_tour, 'Fishtail Lodge',                      '4', 'premium', 'breakfast',         5400, 'Pokhara, Phewa Lake view');

-- ── Car rates (per tour-package destination / car type) ───────
INSERT INTO car_rates (destination_id, car_type_id, car_class, charge_per_day, km_limit_per_day, extra_charge_per_km, notes) VALUES
    -- SIKKIM DARJEELING TOUR
    (@d_sikkim_darjeeling, @ct_sedan,  'standard', 2800, 250, 12, NULL),
    (@d_sikkim_darjeeling, @ct_suv,    'standard', 3800, 250, 14, NULL),
    (@d_sikkim_darjeeling, @ct_innova, 'premium',  4500, 280, 15, NULL),
    (@d_sikkim_darjeeling, @ct_tt12,   'standard', 5200, 250, 18, '12-seater'),

    -- SIKKIM FAMILY SPECIAL
    (@d_sikkim_family, @ct_sedan,  'standard', 3000, 250, 12, NULL),
    (@d_sikkim_family, @ct_suv,    'standard', 4000, 250, 14, NULL),
    (@d_sikkim_family, @ct_innova, 'premium',  4800, 280, 16, NULL),

    -- NORTH SIKKIM EXPLORER
    (@d_north_sikkim, @ct_suv,    'premium',  5200, 200, 18, 'Permit included'),
    (@d_north_sikkim, @ct_innova, 'premium',  6200, 250, 20, NULL),
    (@d_north_sikkim, @ct_hilux,  'premium',  7800, 250, 25, '4x4 for snow'),

    -- SIKKIM PANORAMA
    (@d_sikkim_panorama, @ct_sedan,  'standard', 3000, 250, 12, NULL),
    (@d_sikkim_panorama, @ct_suv,    'standard', 4000, 250, 14, NULL),
    (@d_sikkim_panorama, @ct_innova, 'premium',  4800, 280, 16, NULL),

    -- DARJEELING + MIRIK + KURSEONG
    (@d_dar_mirik_kurseong, @ct_sedan,  'standard', 3000, 250, 12, NULL),
    (@d_dar_mirik_kurseong, @ct_suv,    'standard', 4200, 250, 14, NULL),

    -- DARJEELING KALIMPONG TOUR
    (@d_darjeeling_kalimpong, @ct_sedan,  'standard', 3200, 250, 12, NULL),
    (@d_darjeeling_kalimpong, @ct_suv,    'standard', 4400, 250, 14, NULL),

    -- BHUTAN GETAWAY
    (@d_bhutan_getaway, @ct_suv,    'standard', 4800, 250, 16, 'Bhutan permit support'),
    (@d_bhutan_getaway, @ct_innova, 'premium',  5800, 280, 18, NULL),

    -- NEPAL HIMALAYAN TOUR
    (@d_nepal_tour, @ct_sedan,  'standard', 2800, 250, 10, NULL),
    (@d_nepal_tour, @ct_suv,    'standard', 3800, 250, 12, NULL),
    (@d_nepal_tour, @ct_innova, 'premium',  4400, 280, 14, NULL);

-- ── Sample leads ─────────────────────────────────────────────
INSERT INTO leads (full_name, email, phone, destination_text, source, notes, created_by) VALUES
    ('Rajesh Sharma',     'rajesh.sharma@gmail.com',  '9876543210', 'Sikkim Family Special',      'website_form', 'Family of 4, Dec 2025 travel',   1),
    ('Priya Thapa',        'priya.thapa@outlook.com',  '9832123456', 'Sikkim Darjeeling Tour',     'google_sheet', 'Honeymoon, budget ~80k',        1),
    ('Amitabh Banerjee',   'amitabh.b@rediffmail.com', '9831098765', 'Sikkim Panorama',           'csv_upload',   'Senior couple, slow pace',      1),
    ('Maya Gurung',        'maya.g@yahoo.com',         '9801234567', 'Sikkim Panorama',           'manual',       'Solo trekker, Kanchenjunga base camp', 1),
    ('Sandeep Chettri',    NULL,                       '9647123456', 'Bhutan Getaway',            'website_form', 'Referral from Rajesh',         1);

-- ── Sample quotation: Sikkim Family Special ─────────────────
-- Customer: Rajesh Sharma; 2 adults + 1 child (>5) + 1 child (<5)
-- 7 days / 6 nights, Gangtok(3N) + Lachung(1N) + Pelling(2N)
-- Package: hotel_car
INSERT INTO quotations (
    quotation_number, lead_id, customer_name, customer_email, customer_phone, created_by,
    destination_id, destination_text, trip_start_date, trip_end_date,
    adults, children_below_5, children_above_5, num_rooms, package_type,
    markup_pct, gst_pct, status, valid_till, terms_notes
) VALUES (
    'QUO-2025-0001', 1, 'Rajesh Sharma', 'rajesh.sharma@gmail.com', '9876543210', 1,
    @d_sikkim_family, 'Gangtok + Lachung + Pelling', '2025-12-22', '2025-12-28',
    2, 1, 1, 2, 'hotel_car',
    12, 5, 'sent', '2025-12-15',
    'Inclusions: Accommodation, breakfast & dinner, all transfers & sightseeing by private car, permits for North Sikkim & Tsomgo.\n\nExclusions: Air/train fare, personal expenses, entry fees, lunch, guide gratuity.\n\nCancellation: 30+ days 10%, 15-30 days 25%, 7-15 days 50%, <7 days 100%.'
);

SET @q1 = LAST_INSERT_ID();

-- Hotels for Q1
INSERT INTO quotation_hotels (quotation_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, num_nights, num_rooms, special_charges, special_charges_note, sort_order) VALUES
    (@q1, 'Hotel Mount Siniolchu',         '4', 'premium', 'breakfast',         5800, 3, 1,    0, NULL, 0),
    (@q1, 'Yumthang Valley Resort',        '3', 'deluxe',  'breakfast_dinner', 3800, 1, 1, 1500, 'Hot water / heater surcharge for child', 1),
    (@q1, 'The Elgin Mount Pandim',        '4', 'premium', 'breakfast',         6200, 2, 1,    0, NULL, 2);

-- Car for Q1 (Innova for 6 days, North Sikkim permit support)
INSERT INTO quotation_cars (quotation_id, car_type_name, car_class, charge_per_day, num_days, km_limit_per_day, extra_charge_per_km, estimated_extra_km, sort_order) VALUES
    (@q1, 'Innova Crysta', 'premium', 4500, 6, 280, 15, 50, 0);

-- Misc for Q1
INSERT INTO quotation_misc (quotation_id, label, amount, sort_order) VALUES
    (@q1, 'North Sikkim permit (Lachung/Lachen)', 800,  0),
    (@q1, 'Tsomgo Lake + Nathula permit',          600,  1),
    (@q1, 'Guide charges (Lachung + Pelling)',    2500,  2),
    (@q1, 'Entrance fees (estimated)',            1200,  3),
    (@q1, 'Welcome flower bouquet',                500,  4);

-- Recalculate totals for Q1
UPDATE quotations q
   SET hotel_total  = (SELECT COALESCE(SUM(line_total),0) FROM quotation_hotels  WHERE quotation_id = q.id),
       car_total    = (SELECT COALESCE(SUM(line_total),0) FROM quotation_cars    WHERE quotation_id = q.id),
       misc_total   = (SELECT COALESCE(SUM(amount),0)     FROM quotation_misc    WHERE quotation_id = q.id),
       subtotal     = (SELECT COALESCE(SUM(line_total),0) FROM quotation_hotels  WHERE quotation_id = q.id)
                    + (SELECT COALESCE(SUM(line_total),0) FROM quotation_cars    WHERE quotation_id = q.id)
                    + (SELECT COALESCE(SUM(amount),0)     FROM quotation_misc    WHERE quotation_id = q.id)
 WHERE q.id = @q1;
UPDATE quotations
   SET markup_amount = subtotal * markup_pct / 100,
       gst_amount    = (subtotal + markup_amount) * gst_pct / 100,
       grand_total   = subtotal + markup_amount + gst_amount
 WHERE id = @q1;

-- ── Sample quotation 2: Darjeeling + Gangtok honeymoon ─────
-- Priya Thapa; 2 adults; 5 days / 4 nights
INSERT INTO quotations (
    quotation_number, lead_id, customer_name, customer_email, customer_phone, created_by,
    destination_id, destination_text, trip_start_date, trip_end_date,
    adults, children_below_5, children_above_5, num_rooms, package_type,
    markup_pct, gst_pct, status, valid_till, terms_notes
) VALUES (
    'QUO-2025-0002', 2, 'Priya Thapa', 'priya.thapa@outlook.com', '9832123456', 1,
    @d_sikkim_darjeeling, 'Darjeeling (2N) + Gangtok (2N)', '2025-11-14', '2025-11-18',
    2, 0, 0, 1, 'hotel_car',
    10, 5, 'accepted', '2025-11-07',
    'Honeymoon inclusions: room decoration on 1 night, candle-light dinner at Darjeeling hotel, cake.'
);

SET @q2 = LAST_INSERT_ID();

INSERT INTO quotation_hotels (quotation_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, num_nights, num_rooms, special_charges, special_charges_note, sort_order) VALUES
    (@q2, 'The Elgin Darjeeling', '4', 'premium', 'breakfast_dinner', 6800, 2, 1, 4500, 'Honeymoon setup + cake', 0),
    (@q2, 'Hotel Mount Siniolchu', '4', 'premium', 'breakfast',         5800, 2, 1, 2500, 'Honeymoon decoration',    1);

INSERT INTO quotation_cars (quotation_id, car_type_name, car_class, charge_per_day, num_days, km_limit_per_day, extra_charge_per_km, estimated_extra_km, sort_order) VALUES
    (@q2, 'Innova Crysta', 'premium', 4800, 5, 280, 16, 30, 0);

INSERT INTO quotation_misc (quotation_id, label, amount, sort_order) VALUES
    (@q2, 'Tiger Hill sunrise tour',          800, 0),
    (@q2, 'Toy train joy ride (Darjeeling)', 1800, 1),
    (@q2, 'Tsomgo + Nathula permit',          600, 2),
    (@q2, 'Guide charges',                   1500, 3);

UPDATE quotations q
   SET hotel_total  = (SELECT COALESCE(SUM(line_total),0) FROM quotation_hotels  WHERE quotation_id = q.id),
       car_total    = (SELECT COALESCE(SUM(line_total),0) FROM quotation_cars    WHERE quotation_id = q.id),
       misc_total   = (SELECT COALESCE(SUM(amount),0)     FROM quotation_misc    WHERE quotation_id = q.id),
       subtotal     = (SELECT COALESCE(SUM(line_total),0) FROM quotation_hotels  WHERE quotation_id = q.id)
                    + (SELECT COALESCE(SUM(line_total),0) FROM quotation_cars    WHERE quotation_id = q.id)
                    + (SELECT COALESCE(SUM(amount),0)     FROM quotation_misc    WHERE quotation_id = q.id)
 WHERE q.id = @q2;
UPDATE quotations
   SET markup_amount = subtotal * markup_pct / 100,
       gst_amount    = (subtotal + markup_amount) * gst_pct / 100,
       grand_total   = subtotal + markup_amount + gst_amount
 WHERE id = @q2;

-- ── Sample quotation 3: Yuksom trek ────────────────────────
-- Maya Gurung; 1 adult; 6 days / 5 nights; trek base
INSERT INTO quotations (
    quotation_number, lead_id, customer_name, customer_email, customer_phone, created_by,
    destination_id, destination_text, trip_start_date, trip_end_date,
    adults, children_below_5, children_above_5, num_rooms, package_type,
    markup_pct, gst_pct, status, valid_till
) VALUES (
    'QUO-2025-0003', 4, 'Maya Gurung', 'maya.g@yahoo.com', '9801234567', 1,
    @d_sikkim_panorama, 'Yuksom - Dzongri Trek', '2025-10-18', '2025-10-23',
    1, 0, 0, 1, 'hotel_car',
    10, 5, 'draft', '2025-10-15'
);

SET @q3 = LAST_INSERT_ID();

INSERT INTO quotation_hotels (quotation_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, num_nights, num_rooms, sort_order) VALUES
    (@q3, 'Tashigang Resort',     '3', 'deluxe',  'breakfast',         3500, 2, 1, 0),
    (@q3, 'Yuksom Holiday Home',  '2', 'standard','breakfast_dinner',  1800, 3, 1, 1);

INSERT INTO quotation_cars (quotation_id, car_type_name, car_class, charge_per_day, num_days, km_limit_per_day, extra_charge_per_km, estimated_extra_km, sort_order) VALUES
    (@q3, 'Bolero (Hill Spec)', 'standard', 3800, 6, 200, 14, 80, 0);

INSERT INTO quotation_misc (quotation_id, label, amount, sort_order) VALUES
    (@q3, 'Trekking guide (Dzongri)',         4500, 0),
    (@q3, 'Permit fees (Kanchenjunga NP)',     1200, 1),
    (@q3, 'Porter (optional, 12kg)',           3000, 2),
    (@q3, 'Camping equipment for 2 nights',    2500, 3);

UPDATE quotations q
   SET hotel_total  = (SELECT COALESCE(SUM(line_total),0) FROM quotation_hotels  WHERE quotation_id = q.id),
       car_total    = (SELECT COALESCE(SUM(line_total),0) FROM quotation_cars    WHERE quotation_id = q.id),
       misc_total   = (SELECT COALESCE(SUM(amount),0)     FROM quotation_misc    WHERE quotation_id = q.id),
       subtotal     = (SELECT COALESCE(SUM(line_total),0) FROM quotation_hotels  WHERE quotation_id = q.id)
                    + (SELECT COALESCE(SUM(line_total),0) FROM quotation_cars    WHERE quotation_id = q.id)
                    + (SELECT COALESCE(SUM(amount),0)     FROM quotation_misc    WHERE quotation_id = q.id)
 WHERE q.id = @q3;
UPDATE quotations
   SET markup_amount = subtotal * markup_pct / 100,
       gst_amount    = (subtotal + markup_amount) * gst_pct / 100,
       grand_total   = subtotal + markup_amount + gst_amount
 WHERE id = @q3;

-- ── Convert Q2 (accepted) into a booking ────────────────────
INSERT INTO bookings (
    booking_number, quotation_id, customer_name, customer_phone, customer_email,
    destination_text, trip_start_date, trip_end_date, adults, children_below_5, children_above_5,
    total_amount, booking_fee_pct, booking_fee_amount, amount_paid,
    status, payment_status, special_requests, created_by
) VALUES (
    'BKG-2025-0001', @q2, 'Priya Thapa', '9832123456', 'priya.thapa@outlook.com',
    'Darjeeling (2N) + Gangtok (2N)', '2025-11-14', '2025-11-18', 2, 0, 0,
    (SELECT grand_total FROM quotations WHERE id = @q2),
    25, (SELECT grand_total * 0.25 FROM quotations WHERE id = @q2),
    (SELECT grand_total * 0.30 FROM quotations WHERE id = @q2),
    'confirmed', 'partial',
    'Vegetarian meals only. Late check-in at Darjeeling (around 11pm).',
    1
);

-- Also mark Q1 as accepted and create a booking for it (further along the funnel)
UPDATE quotations SET status = 'accepted', accepted_at = NOW() WHERE id = @q1;
INSERT INTO bookings (
    booking_number, quotation_id, customer_name, customer_phone, customer_email,
    destination_text, trip_start_date, trip_end_date, adults, children_below_5, children_above_5,
    total_amount, booking_fee_pct, booking_fee_amount, amount_paid,
    status, payment_status, special_requests, created_by
) VALUES (
    'BKG-2025-0002', @q1, 'Rajesh Sharma', '9876543210', 'rajesh.sharma@gmail.com',
    'Gangtok + Lachung + Pelling', '2025-12-22', '2025-12-28', 2, 1, 1,
    (SELECT grand_total FROM quotations WHERE id = @q1),
    25, (SELECT grand_total * 0.25 FROM quotations WHERE id = @q1),
    (SELECT grand_total * 0.50 FROM quotations WHERE id = @q1),
    'confirmed', 'partial',
    'Family with 2 small children. Need car seat. Vegetarian + 1 non-veg per meal.',
    1
);

-- ── Verification ─────────────────────────────────────────────
SELECT 'destinations' AS tbl, COUNT(*) AS rows_count FROM destinations
UNION ALL SELECT 'car_types',      COUNT(*) FROM car_types
UNION ALL SELECT 'hotel_rates',    COUNT(*) FROM hotel_rates
UNION ALL SELECT 'car_rates',      COUNT(*) FROM car_rates
UNION ALL SELECT 'leads',          COUNT(*) FROM leads
UNION ALL SELECT 'quotations',     COUNT(*) FROM quotations
UNION ALL SELECT 'bookings',       COUNT(*) FROM bookings
UNION ALL SELECT 'agency',         CONCAT(agency_name, ' (', address, ')') FROM agency_settings LIMIT 1;
