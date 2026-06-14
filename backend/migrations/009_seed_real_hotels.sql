-- =============================================================
-- Seed real hotels for Sikkim, Darjeeling, Mirik, Bhutan & Nepal
-- destinations that currently have few or no hotels.
-- Run with: mysql -u root -p tour_crm < seed_real_hotels.sql
-- =============================================================

USE tour_crm;

-- Helper to get destination_id by name
SET @gid   = (SELECT id FROM destinations WHERE name = 'Gangtok');
SET @pid   = (SELECT id FROM destinations WHERE name = 'Pelling');
SET @rid   = (SELECT id FROM destinations WHERE name = 'Ravangla');
SET @yid   = (SELECT id FROM destinations WHERE name = 'Yuksom');
SET @tid   = (SELECT id FROM destinations WHERE name = 'Tsomgo Lake');
SET @zid   = (SELECT id FROM destinations WHERE name = 'Zuluk');
SET @sid   = (SELECT id FROM destinations WHERE name = 'Siliguri');
SET @did   = (SELECT id FROM destinations WHERE name = 'Darjeeling');
SET @mid   = (SELECT id FROM destinations WHERE name = 'Mirik');
SET @phid  = (SELECT id FROM destinations WHERE name = 'Phuentsholing (Bhutan)');
SET @thid  = (SELECT id FROM destinations WHERE name = 'Thimphu (Bhutan)');
SET @paid  = (SELECT id FROM destinations WHERE name = 'Paro (Bhutan)');
SET @kaid  = (SELECT id FROM destinations WHERE name = 'Kathmandu (Nepal)');
SET @pokid = (SELECT id FROM destinations WHERE name = 'Pokhara (Nepal)');

-- ── Gangtok (add 2 more real hotels) ──────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@gid, 'Taj Tashi Gangtok',                 '5', 'luxury',    'breakfast',          18500.00, '2025-01-01', '2026-12-31', 1),
(@gid, 'WelcomHeritage Denzong Regency',    '4', 'premium',   'breakfast_dinner',    7200.00, '2025-01-01', '2026-12-31', 1);

-- ── Pelling (4 real hotels) ───────────────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@pid, 'The Elgin Mount Pandim',            '4', 'premium',   'breakfast',           6200.00, '2025-01-01', '2026-12-31', 1),
(@pid, 'Kabur Himalayan Resort',            '3', 'deluxe',    'breakfast_dinner',    3200.00, '2025-01-01', '2026-12-31', 1),
(@pid, 'Sangri-La Pelling',                 '3', 'deluxe',    'breakfast',           2800.00, '2025-01-01', '2026-12-31', 1),
(@pid, 'Hotel Garuda Pelling',              '2', 'standard',  'none',                1600.00, '2025-01-01', '2026-12-31', 1);

-- ── Ravangla (4 real hotels) ──────────────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@rid, 'Bamboo Retreat Ravangla',           '3', 'deluxe',    'breakfast',           3000.00, '2025-01-01', '2026-12-31', 1),
(@rid, 'Club Mahindra Baiguney',            '4', 'premium',   'all_inclusive',       8500.00, '2025-01-01', '2026-12-31', 1),
(@rid, 'Pemaling Lords Eco Inn',            '2', 'standard',  'breakfast',           1800.00, '2025-01-01', '2026-12-31', 1),
(@rid, 'Ravangla Starlit Hotel',            '2', 'standard',  'none',                1400.00, '2025-01-01', '2026-12-31', 1);

-- ── Yuksom (3 real hotels) ────────────────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@yid, 'Tashigang Resort',                  '3', 'deluxe',    'breakfast',           2600.00, '2025-01-01', '2026-12-31', 1),
(@yid, 'Yuksom Residency',                  '2', 'standard',  'breakfast',           1500.00, '2025-01-01', '2026-12-31', 1),
(@yid, 'Hotel Demazong Yuksom',             '2', 'standard',  'none',                1200.00, '2025-01-01', '2026-12-31', 1);

-- ── Tsomgo Lake (2 real hotels) ──────────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@tid, 'Tsomgo Lake View Homestay',         '2', 'standard',  'breakfast',           2000.00, '2025-01-01', '2026-12-31', 1),
(@tid, 'Changu Lake Retreat',               '2', 'standard',  'none',                1600.00, '2025-01-01', '2026-12-31', 1);

-- ── Zuluk (2 real hotels) ────────────────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@zid, 'Zuluk Homestay & Retreat',          '2', 'standard',  'breakfast',           1800.00, '2025-01-01', '2026-12-31', 1),
(@zid, 'Nimachen Homestay Zuluk',           '2', 'standard',  'none',                1200.00, '2025-01-01', '2026-12-31', 1);

-- ── Siliguri (3 real hotels) ─────────────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@sid, 'Courtyard by Marriott Siliguri',    '5', 'luxury',    'breakfast',          10500.00, '2025-01-01', '2026-12-31', 1),
(@sid, 'Hotel Cindrella',                   '3', 'deluxe',    'breakfast',           3200.00, '2025-01-01', '2026-12-31', 1),
(@sid, 'Hotel Rajdarbar',                   '2', 'standard',  'breakfast',           1600.00, '2025-01-01', '2026-12-31', 1);

-- ── Darjeeling (add 2 more real hotels) ──────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@did, 'Windamere Hotel',                   '3', 'deluxe',    'breakfast_dinner',    5500.00, '2025-01-01', '2026-12-31', 1),
(@did, 'Little Tibet Darjeeling',           '2', 'standard',  'breakfast',           2000.00, '2025-01-01', '2026-12-31', 1);

-- ── Mirik (add 2 more real hotels) ───────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@mid, 'Mirik Retreat & Resort',            '3', 'deluxe',    'breakfast',           3400.00, '2025-01-01', '2026-12-31', 1),
(@mid, 'Sunakhari Homestay Mirik',          '2', 'standard',  'breakfast',           1400.00, '2025-01-01', '2026-12-31', 1);

-- ── Phuentsholing (Bhutan) (2 real hotels) ───────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@phid, 'Druk Hotel Phuentsholing',         '3', 'deluxe',    'breakfast',           4200.00, '2025-01-01', '2026-12-31', 1),
(@phid, 'Hotel Namgay Phuentsholing',       '2', 'standard',  'breakfast',           2200.00, '2025-01-01', '2026-12-31', 1);

-- ── Thimphu (Bhutan) (3 real hotels) ────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@thid, 'Taj Tashi Thimphu',                '5', 'luxury',    'breakfast',          19500.00, '2025-01-01', '2026-12-31', 1),
(@thid, 'Le Meridien Thimphu',              '5', 'luxury',    'breakfast',          16500.00, '2025-01-01', '2026-12-31', 1),
(@thid, 'Hotel Pedling',                    '3', 'deluxe',    'breakfast',           4800.00, '2025-01-01', '2026-12-31', 1);

-- ── Paro (Bhutan) (3 real hotels) ───────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@paid, 'Le Meridien Paro',                 '5', 'luxury',    'breakfast',          17500.00, '2025-01-01', '2026-12-31', 1),
(@paid, 'Tashi Namgay Resort',              '4', 'premium',   'breakfast',           7200.00, '2025-01-01', '2026-12-31', 1),
(@paid, 'Hotel Tandin Paro',                '3', 'deluxe',    'breakfast',           3800.00, '2025-01-01', '2026-12-31', 1);

-- ── Kathmandu (Nepal) (add 2 more real hotels) ──────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@kaid, 'Dwarika\'s Hotel',                  '5', 'luxury',    'breakfast',          14500.00, '2025-01-01', '2026-12-31', 1),
(@kaid, 'Hotel Annapurna',                  '4', 'premium',   'breakfast',           5200.00, '2025-01-01', '2026-12-31', 1);

-- ── Pokhara (Nepal) (3 real hotels) ─────────────────────
INSERT IGNORE INTO hotel_rates (destination_id, hotel_name, star_rating, room_type, meal_plan, charge_per_night, valid_from, valid_till, is_active) VALUES
(@pokid, 'Fish Tail Lodge Pokhara',         '4', 'premium',   'breakfast',           7800.00, '2025-01-01', '2026-12-31', 1),
(@pokid, 'Shangri-La Village Resort',       '4', 'premium',   'breakfast',           6500.00, '2025-01-01', '2026-12-31', 1),
(@pokid, 'Hotel Landmark Pokhara',        '3', 'deluxe',    'breakfast',           3200.00, '2025-01-01', '2026-12-31', 1);
