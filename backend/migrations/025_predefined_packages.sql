-- Migration 025: Predefined Packages Module
-- Add packages table, link it to leads/quotes/bookings, and insert initial seed packages.

USE tour_crm;

SET FOREIGN_KEY_CHECKS = 0;

-- ── 1. Create Packages Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
    id              INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    duration_days   INT UNSIGNED NOT NULL DEFAULT 1,
    duration_nights INT UNSIGNED NOT NULL DEFAULT 0,
    image_url       VARCHAR(500) NULL,
    inclusions      TEXT,
    exclusions      TEXT,
    itinerary       JSON NULL, -- Day-by-day JSON format: [{"day": 1, "title": "...", "description": "..."}]
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_packages_company (company_id, is_active)
) ENGINE=InnoDB;

-- ── 2. Alter Existing Tables to Link Packages ─────────────────

-- leads
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'leads' AND column_name = 'package_id') = 0,
    'ALTER TABLE leads ADD COLUMN package_id INT UNSIGNED NULL AFTER destination_text, ADD CONSTRAINT fk_leads_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- quotations
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'quotations' AND column_name = 'package_id') = 0,
    'ALTER TABLE quotations ADD COLUMN package_id INT UNSIGNED NULL AFTER destination_id, ADD CONSTRAINT fk_quotations_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- bookings
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'bookings' AND column_name = 'package_id') = 0,
    'ALTER TABLE bookings ADD COLUMN package_id INT UNSIGNED NULL AFTER quotation_id, ADD CONSTRAINT fk_bookings_package FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ── 3. Seed Default Packages for Company 1 ───────────────────
DELETE FROM packages WHERE company_id = 1;

INSERT INTO packages (company_id, title, description, price, duration_days, duration_nights, image_url, inclusions, exclusions, itinerary, is_active)
VALUES
(
    1,
    'Sikkim Honeymoon Special',
    'A romantic getaway designed for newlyweds to explore the scenic beauties of Gangtok, Tsomgo Lake, and Pelling. Experience the mist-laden hills, orchid gardens, and pristine monasteries with premium hotel rooms and dedicated private transportation.',
    24999.00,
    6,
    5,
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=800&auto=format&fit=crop',
    '• 5 Nights Accommodation in Deluxe Honeymoon Suites\n• Daily breakfast and dinner (MAP Meal Plan)\n• Private car (Innova/SUV) for all sightseeing & transfers\n• Romantic candle-light dinner on one evening\n• Honeymoon cake and bed decoration upon arrival\n• Toll taxes, parking charges, and driver allowance',
    '• Flight or Train fares\n• Entry fees to monuments and sightseeing locations\n• Personal expenses (laundry, shopping, alcohol)\n• Optional Nathula Pass permit charges (₹4,000 extra per vehicle)\n• Anything not mentioned in Inclusions',
    '[
        {"day": 1, "title": "Arrival in Gangtok", "description": "Upon arrival at Bagdogra Airport or NJP Railway Station, you will be met by our representative and driven to Gangtok (approx. 4.5 hours). Check-in to your hotel, spend the evening exploring M.G. Marg, and enjoy a warm dinner."},
        {"day": 2, "title": "Excursion to Tsomgo Lake & Baba Mandir", "description": "After breakfast, start your day excursion to Tsomgo Lake (12,400 ft) and Baba Harbhajan Singh Mandir. Witness the breathtaking alpine beauty and enjoy the tranquil atmosphere. Return to Gangtok for overnight stay."},
        {"day": 3, "title": "Gangtok Local Sightseeing & Transfer to Pelling", "description": "Morning local sightseeing in Gangtok including Rumtek Monastery, Do Drul Chorten, and the Flower Show. In the afternoon, proceed on a 4-hour scenic drive to Pelling (5,500 ft). Overnight stay in Pelling."},
        {"day": 4, "title": "Pelling Local Sightseeing", "description": "Embark on a full-day sightseeing tour of Pelling. Visit the beautiful Khecheopalri Sacred Lake, Kanchenjunga Waterfalls, Skywalk, and the historic Rabdentse Ruins. Enjoy sunset views of Mount Kanchenjunga."},
        {"day": 5, "title": "Pelling to Gangtok via Ravangla", "description": "After breakfast, return to Gangtok. En route, stop at Ravangla and visit the magnificent Buddha Park (Tathagata Tsal) featuring a 130-foot tall Buddha statue. Check-in to hotel in Gangtok for your final evening."},
        {"day": 6, "title": "Departure Transfer", "description": "After breakfast, check out from the hotel. Our driver will transfer you back to Bagdogra Airport or NJP Railway Station with sweet memories of your Himalayan honeymoon."}
    ]',
    1
),
(
    1,
    'Gangtok & North Sikkim Explorer',
    'Discover the rugged beauty and untouched landscapes of North Sikkim. This tour takes you high into the Eastern Himalayas to visit the alpine meadows of Lachen, Lachung, Yumthang Valley, and the sacred high-altitude Gurudongmar Lake.',
    18500.00,
    5,
    4,
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=800&auto=format&fit=crop',
    '• 2 Nights in Gangtok, 1 Night in Lachen, 1 Night in Lachung\n• All meals (Breakfast, Lunch, Dinner) in Lachen & Lachung\n• Permits for North Sikkim & Gurudongmar Lake\n• Exclusive vehicle for all transfers and sightseeing\n• Local guides and driver allowances',
    '• Nathula Pass permit fee\n• Optional visit to Zero Point (₹3,500 extra payable directly to driver)\n• Travel insurance\n• Mineral water, soft drinks, and laundry',
    '[
        {"day": 1, "title": "Arrival & Gangtok Stay", "description": "Transfer from NJP/Bagdogra to Gangtok. Briefing on the trip permits in the evening. Spend your time shopping at M.G. Marg."},
        {"day": 2, "title": "Gangtok to Lachen", "description": "Start a scenic 6-hour journey to Lachen (8,838 ft) in North Sikkim. En-route stop at Singhik Viewpoint and Seven Sisters Waterfalls. Arrive in Lachen, check-in to a cozy homestay/hotel, and rest in preparation for the early morning high-altitude trip."},
        {"day": 3, "title": "Gurudongmar Lake & Transfer to Lachung", "description": "Early morning drive (4:00 AM) to the pristine Gurudongmar Lake (17,800 ft), one of the highest lakes in the world. Return to Lachen for lunch, check out, and transfer to Lachung (8,600 ft). Overnight in Lachung."},
        {"day": 4, "title": "Yumthang Valley Excursion & Return to Gangtok", "description": "Excursion to Yumthang Valley, known as the Valley of Flowers. Marvel at the alpine pastures and hot springs. Optional drive to Zero Point (Yumesamdong). Return to Lachung for lunch, and drive back to Gangtok for overnight stay."},
        {"day": 5, "title": "Departure Transfer", "description": "Check out after breakfast and transfer to Bagdogra Airport or NJP Station for your journey home."}
    ]',
    1
),
(
    1,
    'Darjeeling Tea Garden Special',
    'Soak in the colonial charm, heritage toy train rides, and lush green tea gardens of Darjeeling. This itinerary offers a relaxing short vacation visiting Tiger Hill sunrise, Batasia Loop, and historic tea estates.',
    12999.00,
    4,
    3,
    'https://images.unsplash.com/photo-1542856391-010fb87dcfed?q=80&w=800&auto=format&fit=crop',
    '• 3 Nights Accommodation in Darjeeling Standard/Premium hotels\n• Daily breakfast at the hotel\n• Sightseeing in private Hatchback/Sedan\n• Tea Estate guided walk and tea tasting session\n• All tax and driver allowance included',
    '• Toy train tickets (needs booking in advance)\n• Lunch and dinner meals\n• Personal porter charges\n• Entrance fees to Zoo, Mountaineering Institute, and museums',
    '[
        {"day": 1, "title": "Arrival in Darjeeling", "description": "Drive from NJP/Bagdogra to Darjeeling (approx. 3.5 hours). Pass through tea estates and winding roads. Check-in and relax at your hotel. Enjoy an evening walk on the Mall Road."},
        {"day": 2, "title": "Tiger Hill Sunrise & Local Sightseeing", "description": "Wake up at 3:45 AM and drive to Tiger Hill to watch the spectacular sunrise over Mount Kanchenjunga. On the way back, visit Ghoom Monastery and Batasia Loop. After breakfast, do a city tour visiting the Himalayan Mountaineering Institute, Padmaja Naidu Zoo, and Tibetan Refugee Self Help Center."},
        {"day": 3, "title": "Tea Garden Tour & Mirik Excursion", "description": "Visit a heritage Tea Estate, walk among the tea shrubs, and enjoy a professional tea tasting session. In the afternoon, enjoy an excursion to the beautiful Mirik Lake, famous for boating and pine forests. Drive back via the Nepal border road."},
        {"day": 4, "title": "Departure Transfer", "description": "After breakfast, check out from the hotel and transfer to NJP/Bagdogra for your return journey."}
    ]',
    1
);
