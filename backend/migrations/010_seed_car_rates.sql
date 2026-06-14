-- =============================================================
-- Seed car rates for Sikkim, Darjeeling, Mirik, Bhutan & Nepal
-- destinations (filling gaps where rates don't exist yet).
-- Run with: mysql -u root -p tour_crm < seed_car_rates.sql
-- =============================================================

USE tour_crm;

-- Car type IDs
SET @sedan  = (SELECT id FROM car_types WHERE name = 'Sedan (Dzire / Etios)' LIMIT 1);
SET @suv    = (SELECT id FROM car_types WHERE name = 'SUV (Innova / Scorpio)' LIMIT 1);
SET @crysta = (SELECT id FROM car_types WHERE name = 'Innova Crysta' LIMIT 1);
SET @tt12   = (SELECT id FROM car_types WHERE name = 'Tempo Traveller (12 Seater)' LIMIT 1);
SET @tt17   = (SELECT id FROM car_types WHERE name = 'Tempo Traveller (17 Seater)' LIMIT 1);
SET @bolero = (SELECT id FROM car_types WHERE name = 'Bolero / Sumo (Hill Spec)' LIMIT 1);
SET @hilux  = (SELECT id FROM car_types WHERE name = 'Toyota Hilux (4x4)' LIMIT 1);
SET @mini   = (SELECT id FROM car_types WHERE name = 'Mini Bus (20 Seater)' LIMIT 1);

-- Destination IDs
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
SET @bid   = (SELECT id FROM destinations WHERE name = 'Bagdogra');
SET @kid   = (SELECT id FROM destinations WHERE name = 'Kalimpong');
SET @kuid  = (SELECT id FROM destinations WHERE name = 'Kurseong');
SET @nid   = (SELECT id FROM destinations WHERE name = 'Namchi');
SET @lac   = (SELECT id FROM destinations WHERE name = 'Lachen');
SET @lach  = (SELECT id FROM destinations WHERE name = 'Lachung');

-- Helper: insert if not exists (by destination_id + car_type_id)
INSERT IGNORE INTO car_rates (destination_id, car_type_id, car_class, charge_per_day, km_limit_per_day, extra_charge_per_km, valid_from, valid_till, is_active) VALUES

-- ── Gangtok (add missing Tempo Travellers + Hilux) ────────
(@gid, @tt12, 'standard', 5200.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),
(@gid, @tt17, 'standard', 6500.00, 250, 20.00, '2025-01-01', '2026-12-31', 1),
(@gid, @hilux, 'premium', 8000.00, 250, 25.00, '2025-01-01', '2026-12-31', 1),

-- ── Pelling (add Hilux for off-road) ────────────────────
(@pid, @hilux, 'premium', 7200.00, 200, 22.00, '2025-01-01', '2026-12-31', 1),
(@pid, @tt12, 'standard', 4800.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Ravangla (add Innova Crysta + Tempo Traveller) ──────
(@rid, @crysta, 'premium', 4800.00, 280, 15.00, '2025-01-01', '2026-12-31', 1),
(@rid, @tt12, 'standard', 5000.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Yuksom (add Sedan + Tempo Traveller) ────────────────
(@yid, @sedan, 'standard', 3200.00, 250, 14.00, '2025-01-01', '2026-12-31', 1),
(@yid, @tt12, 'standard', 4800.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Tsomgo Lake (new — 2 cars only due to permits) ─────
(@tid, @suv, 'premium', 5000.00, 200, 18.00, '2025-01-01', '2026-12-31', 1),
(@tid, @bolero, 'standard', 4500.00, 200, 16.00, '2025-01-01', '2026-12-31', 1),

-- ── Zuluk (new — 2 cars only due to permits) ─────────────
(@zid, @suv, 'premium', 5500.00, 200, 18.00, '2025-01-01', '2026-12-31', 1),
(@zid, @bolero, 'standard', 4800.00, 200, 16.00, '2025-01-01', '2026-12-31', 1),

-- ── Siliguri (add Tempo Traveller + Mini Bus) ────────────
(@sid, @tt17, 'standard', 5800.00, 250, 20.00, '2025-01-01', '2026-12-31', 1),
(@sid, @mini, 'standard', 7200.00, 250, 24.00, '2025-01-01', '2026-12-31', 1),

-- ── Darjeeling (add Tempo Traveller + Bolero) ───────────
(@did, @bolero, 'standard', 4200.00, 200, 16.00, '2025-01-01', '2026-12-31', 1),
(@did, @tt12, 'standard', 5500.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Mirik (add Innova Crysta + Tempo Traveller) ─────────
(@mid, @crysta, 'premium', 4600.00, 280, 15.00, '2025-01-01', '2026-12-31', 1),
(@mid, @tt12, 'standard', 5000.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Bagdogra (add Innova Crysta + Mini Bus) ────────────
(@bid, @crysta, 'premium', 4200.00, 280, 14.00, '2025-01-01', '2026-12-31', 1),
(@bid, @mini, 'standard', 6800.00, 250, 22.00, '2025-01-01', '2026-12-31', 1),

-- ── Kalimpong (add Innova Crysta + Tempo Traveller) ─────
(@kid, @crysta, 'premium', 4800.00, 280, 15.00, '2025-01-01', '2026-12-31', 1),
(@kid, @tt12, 'standard', 5200.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Kurseong (add Innova Crysta) ───────────────────────
(@kui, @crysta, 'premium', 4600.00, 280, 15.00, '2025-01-01', '2026-12-31', 1),

-- ── Namchi (add Tempo Traveller) ───────────────────────
(@nid, @tt12, 'standard', 4800.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Phuentsholing (add Sedan + Tempo Traveller) ─────────
(@phid, @sedan, 'standard', 3200.00, 250, 14.00, '2025-01-01', '2026-12-31', 1),
(@phid, @tt12, 'standard', 5200.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Thimphu (add Sedan + Tempo Traveller + Mini Bus) ────
(@thid, @sedan, 'standard', 3600.00, 250, 14.00, '2025-01-01', '2026-12-31', 1),
(@thid, @tt12, 'standard', 5800.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),
(@thid, @mini, 'standard', 7500.00, 250, 24.00, '2025-01-01', '2026-12-31', 1),

-- ── Paro (add Sedan + Tempo Traveller) ──────────────────
(@paid, @sedan, 'standard', 3800.00, 250, 14.00, '2025-01-01', '2026-12-31', 1),
(@paid, @tt12, 'standard', 5800.00, 250, 18.00, '2025-01-01', '2026-12-31', 1),

-- ── Kathmandu (add Tempo Traveller + Mini Bus) ───────────
(@kaid, @tt12, 'standard', 4800.00, 250, 16.00, '2025-01-01', '2026-12-31', 1),
(@kaid, @mini, 'standard', 6500.00, 250, 22.00, '2025-01-01', '2026-12-31', 1),

-- ── Pokhara (add Tempo Traveller + Mini Bus) ─────────────
(@pokid, @tt12, 'standard', 4600.00, 250, 16.00, '2025-01-01', '2026-12-31', 1),
(@pokid, @mini, 'standard', 6200.00, 250, 22.00, '2025-01-01', '2026-12-31', 1),

-- ── Lachen (add Sedan — only for Bagdogra-Gangtok-Lachen route) ─
(@lac, @sedan, 'standard', 3800.00, 200, 14.00, '2025-01-01', '2026-12-31', 1),

-- ── Lachung (add Sedan) ────────────────────────────────
(@lach, @sedan, 'standard', 3800.00, 200, 14.00, '2025-01-01', '2026-12-31', 1);
