-- =============================================================
-- Tour & Travel Agency CRM — PostgreSQL Schema
-- Migration: 001_initial_schema.sql
-- =============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE lead_status AS ENUM (
    'new', 'hot', 'warm', 'cold', 'follow_later', 'junked', 'converted', 'not_converted'
);

CREATE TYPE lead_source AS ENUM (
    'google_sheet', 'website_form', 'csv_upload', 'manual'
);

CREATE TYPE package_type AS ENUM (
    'hotel', 'car', 'flight', 'hotel_car', 'hotel_flight', 'car_flight', 'hotel_car_flight'
);

CREATE TYPE meal_plan AS ENUM (
    'none', 'breakfast', 'breakfast_dinner', 'all_inclusive'
);

CREATE TYPE room_type AS ENUM (
    'standard', 'deluxe', 'premium', 'luxury', 'suite'
);

CREATE TYPE car_class AS ENUM (
    'economy', 'standard', 'premium', 'luxury'
);

CREATE TYPE quotation_status AS ENUM (
    'draft', 'sent', 'accepted', 'rejected', 'expired'
);

CREATE TYPE booking_status AS ENUM (
    'confirmed', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE payment_status AS ENUM (
    'pending', 'partial', 'paid', 'refunded', 'failed'
);

CREATE TYPE payment_method AS ENUM (
    'cashfree_online', 'cash', 'bank_transfer', 'cheque', 'upi_manual'
);

CREATE TYPE staff_role AS ENUM (
    'admin', 'manager', 'telecaller', 'accounts'
);

CREATE TYPE hotel_star AS ENUM (
    '1', '2', '3', '4', '5'
);

-- =============================================================
-- SECTION 1: STAFF / CRM USERS
-- =============================================================

CREATE TABLE staff_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(200) NOT NULL UNIQUE,
    phone           VARCHAR(20),
    password_hash   TEXT NOT NULL,
    role            staff_role NOT NULL DEFAULT 'telecaller',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id    UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SECTION 2: MASTER / ADMIN DATA
-- =============================================================

CREATE TABLE destinations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    state           VARCHAR(100),
    country         VARCHAR(100) NOT NULL DEFAULT 'India',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hotel rate master (admin manages these; quotation pulls from here)
CREATE TABLE hotel_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id  UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    hotel_name      VARCHAR(200) NOT NULL,
    star_rating     hotel_star NOT NULL,
    room_type       room_type NOT NULL,
    meal_plan       meal_plan NOT NULL DEFAULT 'none',
    charge_per_night NUMERIC(10,2) NOT NULL CHECK (charge_per_night >= 0),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from      DATE,
    valid_till      DATE,
    notes           TEXT,
    created_by      UUID REFERENCES staff_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Car/Cab type master
CREATE TABLE car_types (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,           -- e.g. Sedan, Hatchback, SUV, Tempo Traveller
    capacity    INTEGER NOT NULL DEFAULT 4,       -- passenger capacity
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Car rate master per location/destination
CREATE TABLE car_rates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id      UUID NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
    car_type_id         UUID NOT NULL REFERENCES car_types(id) ON DELETE CASCADE,
    car_class           car_class NOT NULL DEFAULT 'standard',
    charge_per_day      NUMERIC(10,2) NOT NULL CHECK (charge_per_day >= 0),
    km_limit_per_day    INTEGER NOT NULL DEFAULT 250,       -- km included in daily rate
    extra_charge_per_km NUMERIC(8,2) NOT NULL DEFAULT 12,   -- per km beyond limit
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from          DATE,
    valid_till          DATE,
    notes               TEXT,
    created_by          UUID REFERENCES staff_users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agency-level settings
CREATE TABLE agency_settings (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_name             VARCHAR(200) NOT NULL,
    address                 TEXT,
    phone                   VARCHAR(30),
    email                   VARCHAR(200),
    website                 VARCHAR(200),
    gstin                   VARCHAR(20),
    logo_url                TEXT,
    default_booking_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,  -- % of total
    default_markup_pct      NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    default_gst_pct         NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    default_quotation_valid_days INTEGER NOT NULL DEFAULT 7,
    invoice_prefix          VARCHAR(20) NOT NULL DEFAULT 'INV',
    invoice_counter         INTEGER NOT NULL DEFAULT 1000,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SECTION 3: CUSTOMERS
-- =============================================================

CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(200) UNIQUE,
    phone           VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    id_type         VARCHAR(50),                -- Aadhaar, Passport, etc.
    id_number       VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP table for customer portal login
CREATE TABLE customer_otps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(200) NOT NULL,
    otp_hash    TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_otps_email ON customer_otps (email);

-- =============================================================
-- SECTION 4: LEADS
-- =============================================================

CREATE TABLE leads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID REFERENCES customers(id),          -- linked after conversion
    full_name           VARCHAR(200) NOT NULL,
    email               VARCHAR(200),
    phone               VARCHAR(20) NOT NULL,
    alternate_phone     VARCHAR(20),
    source              lead_source NOT NULL DEFAULT 'manual',
    source_ref          VARCHAR(200),                           -- e.g. Meta Ad ID, Sheet row
    destination_id      UUID REFERENCES destinations(id),
    destination_text    VARCHAR(200),                           -- free text if not in DB
    travel_date_approx  DATE,
    pax_adults          INTEGER,
    pax_children        INTEGER,
    budget_approx       NUMERIC(12,2),
    status              lead_status NOT NULL DEFAULT 'new',
    assigned_to         UUID REFERENCES staff_users(id),
    follow_up_at        TIMESTAMPTZ,                            -- next follow-up scheduled
    converted_at        TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads (status);
CREATE INDEX idx_leads_assigned_to ON leads (assigned_to);
CREATE INDEX idx_leads_follow_up_at ON leads (follow_up_at);
CREATE INDEX idx_leads_phone ON leads (phone);
CREATE INDEX idx_leads_email ON leads (email);

-- Follow-up activity log per lead
CREATE TABLE lead_follow_ups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff_users(id),
    call_outcome    VARCHAR(100),                               -- e.g. "Answered", "Not reachable"
    notes           TEXT,
    status_set_to   lead_status,                                -- what status was set after this call
    next_follow_up  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_lead_id ON lead_follow_ups (lead_id);

-- Google Sheets sync state
CREATE TABLE sync_state (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id        VARCHAR(200) NOT NULL UNIQUE,
    last_synced_row INTEGER NOT NULL DEFAULT 1,
    last_synced_at  TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SECTION 5: QUOTATIONS
-- =============================================================

CREATE TABLE quotations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number    VARCHAR(50) NOT NULL UNIQUE,            -- e.g. QUO-2024-0001
    lead_id             UUID NOT NULL REFERENCES leads(id),
    customer_id         UUID REFERENCES customers(id),
    created_by          UUID NOT NULL REFERENCES staff_users(id),

    -- Trip details
    destination_id      UUID REFERENCES destinations(id),
    destination_text    VARCHAR(200),
    trip_start_date     DATE NOT NULL,
    trip_end_date       DATE NOT NULL,
    nights              INTEGER GENERATED ALWAYS AS (trip_end_date - trip_start_date) STORED,
    adults              INTEGER NOT NULL DEFAULT 1,
    children_below_5    INTEGER NOT NULL DEFAULT 0,
    children_above_5    INTEGER NOT NULL DEFAULT 0,
    num_rooms           INTEGER NOT NULL DEFAULT 1,
    package_type        package_type NOT NULL,

    -- Charges summary (auto-calculated from line items)
    hotel_total         NUMERIC(12,2) NOT NULL DEFAULT 0,
    car_total           NUMERIC(12,2) NOT NULL DEFAULT 0,
    flight_total        NUMERIC(12,2) NOT NULL DEFAULT 0,
    misc_total          NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
    markup_pct          NUMERIC(5,2) NOT NULL DEFAULT 0,
    markup_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    gst_pct             NUMERIC(5,2) NOT NULL DEFAULT 0,
    gst_amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total         NUMERIC(12,2) NOT NULL DEFAULT 0,

    -- Meta
    status              quotation_status NOT NULL DEFAULT 'draft',
    valid_till          DATE,
    terms_notes         TEXT,
    internal_notes      TEXT,
    version             INTEGER NOT NULL DEFAULT 1,
    sent_at             TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    rejected_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotations_lead_id ON quotations (lead_id);
CREATE INDEX idx_quotations_status ON quotations (status);
CREATE INDEX idx_quotations_number ON quotations (quotation_number);

-- Hotel line items within a quotation
CREATE TABLE quotation_hotels (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id        UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    hotel_rate_id       UUID REFERENCES hotel_rates(id),        -- source from master (nullable: manual)
    hotel_name          VARCHAR(200) NOT NULL,
    star_rating         hotel_star,
    room_type           room_type NOT NULL,
    meal_plan           meal_plan NOT NULL DEFAULT 'none',
    charge_per_night    NUMERIC(10,2) NOT NULL,
    num_nights          INTEGER NOT NULL,
    num_rooms           INTEGER NOT NULL DEFAULT 1,
    special_charges     NUMERIC(10,2) NOT NULL DEFAULT 0,
    special_charges_note VARCHAR(300),
    line_total          NUMERIC(12,2) GENERATED ALWAYS AS (
                            (charge_per_night * num_nights * num_rooms) + special_charges
                        ) STORED,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Car line items within a quotation
CREATE TABLE quotation_cars (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id        UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    car_rate_id         UUID REFERENCES car_rates(id),           -- source from master
    car_type_name       VARCHAR(100) NOT NULL,
    car_class           car_class NOT NULL DEFAULT 'standard',
    charge_per_day      NUMERIC(10,2) NOT NULL,
    num_days            INTEGER NOT NULL,
    km_limit_per_day    INTEGER NOT NULL DEFAULT 250,
    extra_charge_per_km NUMERIC(8,2) NOT NULL DEFAULT 0,
    estimated_extra_km  INTEGER NOT NULL DEFAULT 0,
    extra_km_charges    NUMERIC(10,2) GENERATED ALWAYS AS (
                            estimated_extra_km * extra_charge_per_km
                        ) STORED,
    line_total          NUMERIC(12,2) GENERATED ALWAYS AS (
                            (charge_per_day * num_days) + (estimated_extra_km * extra_charge_per_km)
                        ) STORED,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flight line items
CREATE TABLE quotation_flights (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id        UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    airline             VARCHAR(100),
    route               VARCHAR(200),                            -- e.g. DEL → GOA
    flight_date         DATE,
    fare_per_adult      NUMERIC(10,2) NOT NULL DEFAULT 0,
    fare_per_child      NUMERIC(10,2) NOT NULL DEFAULT 0,
    num_adults          INTEGER NOT NULL DEFAULT 1,
    num_children        INTEGER NOT NULL DEFAULT 0,
    line_total          NUMERIC(12,2) GENERATED ALWAYS AS (
                            (fare_per_adult * num_adults) + (fare_per_child * num_children)
                        ) STORED,
    sort_order          INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Miscellaneous line items
CREATE TABLE quotation_misc (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id    UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    label           VARCHAR(200) NOT NULL,                       -- e.g. "Guide charges", "Entrance fees"
    amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quotation version history (snapshot on each update)
CREATE TABLE quotation_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id    UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    snapshot_json   JSONB NOT NULL,                              -- full quotation state at that version
    changed_by      UUID NOT NULL REFERENCES staff_users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- SECTION 6: BOOKINGS
-- =============================================================

CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number      VARCHAR(50) NOT NULL UNIQUE,             -- e.g. BKG-2024-0001
    quotation_id        UUID NOT NULL REFERENCES quotations(id),
    lead_id             UUID NOT NULL REFERENCES leads(id),
    customer_id         UUID NOT NULL REFERENCES customers(id),
    created_by          UUID NOT NULL REFERENCES staff_users(id),

    -- Trip snapshot (denormalized for stability)
    destination_text    VARCHAR(200) NOT NULL,
    trip_start_date     DATE NOT NULL,
    trip_end_date       DATE NOT NULL,
    adults              INTEGER NOT NULL,
    children_below_5    INTEGER NOT NULL DEFAULT 0,
    children_above_5    INTEGER NOT NULL DEFAULT 0,

    -- Financials
    total_amount        NUMERIC(12,2) NOT NULL,
    booking_fee_pct     NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    booking_fee_amount  NUMERIC(12,2) NOT NULL,
    total_paid          NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_due         NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - total_paid) STORED,

    -- Status
    status              booking_status NOT NULL DEFAULT 'confirmed',
    payment_status      payment_status NOT NULL DEFAULT 'pending',
    cancellation_reason TEXT,
    cancelled_at        TIMESTAMPTZ,
    special_requests    TEXT,
    internal_notes      TEXT,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_trip_start_date ON bookings (trip_start_date);

-- =============================================================
-- SECTION 7: PAYMENTS
-- =============================================================

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id         UUID NOT NULL REFERENCES customers(id),

    -- Cashfree fields (for online payments)
    cashfree_order_id   VARCHAR(100) UNIQUE,
    cashfree_payment_id VARCHAR(100),
    payment_session_id  TEXT,

    -- Payment details
    amount              NUMERIC(12,2) NOT NULL,
    currency            CHAR(3) NOT NULL DEFAULT 'INR',
    payment_method      payment_method NOT NULL,
    payment_status      payment_status NOT NULL DEFAULT 'pending',
    reference_number    VARCHAR(200),                            -- cheque/UTR/UPI ref
    payment_date        DATE,

    -- Webhook / verification
    webhook_payload     JSONB,
    verified_at         TIMESTAMPTZ,

    notes               TEXT,
    created_by          UUID REFERENCES staff_users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments (booking_id);
CREATE INDEX idx_payments_cashfree_order_id ON payments (cashfree_order_id);

-- =============================================================
-- SECTION 8: INVOICES
-- =============================================================

CREATE TABLE invoices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number      VARCHAR(50) NOT NULL UNIQUE,             -- e.g. INV-2024-1001
    booking_id          UUID NOT NULL REFERENCES bookings(id),
    customer_id         UUID NOT NULL REFERENCES customers(id),

    -- Amounts
    subtotal            NUMERIC(12,2) NOT NULL,
    cgst_pct            NUMERIC(5,2) NOT NULL DEFAULT 0,
    cgst_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    sgst_pct            NUMERIC(5,2) NOT NULL DEFAULT 0,
    sgst_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    igst_pct            NUMERIC(5,2) NOT NULL DEFAULT 0,
    igst_amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(12,2) NOT NULL,
    total_paid          NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_due         NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - total_paid) STORED,

    -- Meta
    invoice_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date            DATE,
    notes               TEXT,
    pdf_url             TEXT,                                    -- S3 / local path
    created_by          UUID NOT NULL REFERENCES staff_users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_booking_id ON invoices (booking_id);
CREATE INDEX idx_invoices_customer_id ON invoices (customer_id);

-- =============================================================
-- SECTION 9: AUDIT LOG
-- =============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID NOT NULL,
    action          VARCHAR(20) NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
    changed_by      UUID REFERENCES staff_users(id),
    changed_by_type VARCHAR(20) DEFAULT 'staff',                 -- 'staff' or 'customer'
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

-- =============================================================
-- SECTION 10: TRIGGERS — updated_at auto-update
-- =============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_staff_users_updated_at
    BEFORE UPDATE ON staff_users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_quotations_updated_at
    BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_hotel_rates_updated_at
    BEFORE UPDATE ON hotel_rates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_car_rates_updated_at
    BEFORE UPDATE ON car_rates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_destinations_updated_at
    BEFORE UPDATE ON destinations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================
-- SECTION 11: SEED DATA
-- =============================================================

-- Default agency settings
INSERT INTO agency_settings (agency_name, default_booking_fee_pct, default_markup_pct, default_gst_pct)
VALUES ('Your Travel Agency', 20.00, 10.00, 5.00);

-- Sample destinations
INSERT INTO destinations (name, state, country) VALUES
    ('Goa', 'Goa', 'India'),
    ('Manali', 'Himachal Pradesh', 'India'),
    ('Shimla', 'Himachal Pradesh', 'India'),
    ('Jaipur', 'Rajasthan', 'India'),
    ('Kerala (Munnar + Alleppey)', 'Kerala', 'India'),
    ('Andaman Islands', 'Andaman & Nicobar', 'India'),
    ('Darjeeling', 'West Bengal', 'India'),
    ('Ooty', 'Tamil Nadu', 'India'),
    ('Udaipur', 'Rajasthan', 'India'),
    ('Leh Ladakh', 'Ladakh', 'India'),
    ('Dubai', '', 'UAE'),
    ('Bangkok', '', 'Thailand'),
    ('Bali', '', 'Indonesia'),
    ('Singapore', '', 'Singapore'),
    ('Nepal (Kathmandu + Pokhara)', '', 'Nepal');

-- Car types
INSERT INTO car_types (name, capacity) VALUES
    ('Hatchback', 4),
    ('Sedan', 4),
    ('SUV', 6),
    ('Innova Crysta', 7),
    ('Tempo Traveller (12 Seater)', 12),
    ('Tempo Traveller (17 Seater)', 17),
    ('Mini Bus (20 Seater)', 20),
    ('Luxury Sedan', 4),
    ('Luxury SUV', 6);

-- =============================================================
-- SECTION 12: VIEWS (useful for reporting)
-- =============================================================

-- Lead summary view
CREATE VIEW v_lead_summary AS
SELECT
    l.id,
    l.full_name,
    l.phone,
    l.email,
    l.source,
    l.status,
    d.name AS destination,
    l.travel_date_approx,
    l.follow_up_at,
    su.full_name AS assigned_to_name,
    (SELECT COUNT(*) FROM lead_follow_ups lf WHERE lf.lead_id = l.id) AS follow_up_count,
    (SELECT MAX(lf.created_at) FROM lead_follow_ups lf WHERE lf.lead_id = l.id) AS last_follow_up_at,
    l.created_at
FROM leads l
LEFT JOIN destinations d ON d.id = l.destination_id
LEFT JOIN staff_users su ON su.id = l.assigned_to;

-- Booking dashboard view
CREATE VIEW v_booking_summary AS
SELECT
    b.id,
    b.booking_number,
    c.full_name AS customer_name,
    c.phone AS customer_phone,
    b.destination_text,
    b.trip_start_date,
    b.trip_end_date,
    b.adults,
    b.total_amount,
    b.total_paid,
    b.balance_due,
    b.status,
    b.payment_status,
    su.full_name AS created_by_name,
    b.created_at
FROM bookings b
JOIN customers c ON c.id = b.customer_id
JOIN staff_users su ON su.id = b.created_by;

-- Monthly revenue view
CREATE VIEW v_monthly_revenue AS
SELECT
    DATE_TRUNC('month', payment_date) AS month,
    COUNT(*) AS payment_count,
    SUM(amount) AS total_collected,
    COUNT(DISTINCT booking_id) AS bookings_paid
FROM payments
WHERE payment_status = 'paid'
GROUP BY DATE_TRUNC('month', payment_date)
ORDER BY month DESC;

-- =============================================================
-- END OF SCHEMA
-- =============================================================
