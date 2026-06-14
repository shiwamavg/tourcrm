-- Migration 016: Replace individual-place destinations with tour-package destinations
-- Destinations now represent groups of places (tour packages), not individual locations

SET FOREIGN_KEY_CHECKS = 0;

-- Clear dependent data first
TRUNCATE TABLE car_rates;
TRUNCATE TABLE hotel_rates;

-- Nullify quotation destination references (will be re-linked below)
UPDATE quotations SET destination_id = NULL;
UPDATE daywise_itinenary SET company_id = company_id WHERE 1=0; -- no-op, daywise doesn't ref destinations

-- Also clear destination_text on leads if needed (keep them, just update destination_id refs)
UPDATE leads SET destination_text = destination_text; -- no-op

-- Clear and re-insert destinations as tour packages
TRUNCATE TABLE destinations;

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

SET FOREIGN_KEY_CHECKS = 1;

-- Re-link existing quotations to appropriate destinations
-- QUO-2025-0001 (Rajesh, Gangtok+Lachung+Pelling) -> Sikkim Family Special
SET @d = (SELECT id FROM destinations WHERE name = 'Sikkim Family Special');
UPDATE quotations SET destination_id = @d WHERE quotation_number = 'QUO-2025-0001';

-- QUO-2025-0002 (Priya, Darjeeling+Gangtok) -> Sikkim Darjeeling Tour
SET @d = (SELECT id FROM destinations WHERE name = 'Sikkim Darjeeling Tour');
UPDATE quotations SET destination_id = @d WHERE quotation_number = 'QUO-2025-0002';

-- QUO-2025-0003 (Maya, Yuksom) -> Sikkim Panorama
SET @d = (SELECT id FROM destinations WHERE name = 'Sikkim Panorama');
UPDATE quotations SET destination_id = @d WHERE quotation_number = 'QUO-2025-0003';
