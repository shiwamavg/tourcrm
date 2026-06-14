# Tour & Travel Agency CRM — Sikkim Trails Travel

Full-stack travel-agency platform: **CRM** for staff, **customer portal**, and the full
**Quotation → Revise → Book → Pay → Invoice → Review** lifecycle.

## Stack

| Layer | Tech |
|---|---|
| CRM Frontend | Angular 22 (standalone, signals, control-flow syntax) |
| Customer Website | Static HTML/JS/CSS (no build step) |
| Backend API | Node.js + Express + MySQL 8 |
| Auth | Two JWT systems: **staff** (CRM) and **portal** (customers) |
| Database | MySQL 8 (`tour_crm`) — 6 migrations, ENUM/JSON/DECIMAL |
| Payments | Cashfree sandbox (online) + bank transfer (offline) |
| Invoice PDFs | Hand-rolled server-side, no extra npm packages |
| Email OTP | SHA-256 hashed, 10-min TTL, 5 attempts; dev mode logs to console |

## Modules

- **Leads** — sales pipeline with status workflow `new → contacted → qualified
  → converted | lost`. Sources: manual, website form, CSV upload, Meta-ads
  webhook, walk-in, referral, WhatsApp, phone, Google Sheets. Convert a lead
  to a draft quotation with one click.
- **Quotations** — multi-step builder (Trip → Hotels → Cars → Misc → Summary),
  master-rates panel with one-click add, line items remain editable
- **Revisions** — `POST /api/quotations/:id/revise` clones the parent to a new
  draft, marks the parent `superseded`, and bumps `version`. Old revisions
  stay immutable.
- **Bookings** — auto-created from accepted quotations, with status workflow
  `pending → confirmed → completed | cancelled`
- **Payments** — record offline (staff) or customer-initiated online (Cashfree) /
  offline (bank transfer notify). Payment status auto-derives:
  `unpaid → partial → paid`.
- **Invoices** — auto-generated as PDF on first payment; regenerate on demand;
  bank details + GST printed
- **Reviews** — one per booking; ≥25% paid = "verified"; staff moderates
  visibility
- **Customer portal** — OTP login, my bookings, online pay (Cashfree SDK) or
  bank-transfer notify, leave review, download invoice PDF
- **Public reviews page** — read-only testimonial list (no auth)
- **Public demo-request form** — anonymous website form that creates a lead
  with source=`demo_request`
- **Settings** — agency info, bank details, Cashfree config, quotation defaults

## Project Structure

```
TourCRM/
├── plan/                          # Reference docs (read-only)
├── backend/                       # Node.js + Express + MySQL API
│   ├── migrations/
│   │   ├── 001_initial_schema.sql       # 13 base tables
│   │   ├── 002_bookings.sql             # bookings table
│   │   ├── 003_sikkim_seed.sql          # 20 dest + 49 hotel + 51 car rates + 3 quotations + 2 bookings
│   │   ├── 004_quotation_revisions.sql  # parent_quotation_id, revision_note, superseded enum
│   │   ├── 005_payments_invoices_reviews.sql  # 4 new tables (payments, invoices, reviews, customer_otps)
│   │   ├── 006_agency_settings_extras.sql      # bank_* + cashfree_* columns
│   │   └── 007_leads_workflow.sql       # status, assigned_to, follow_up_at, source_meta JSON
│   ├── src/
│   │   ├── config/        # db, env
│   │   ├── controllers/   # auth, quotations, admin, bookings, payments, invoices, reviews, portal, leads
│   │   ├── services/      # cashfree, email-otp
│   │   ├── middleware/    # auth, validate, error
│   │   └── routes/        # all routers
│   ├── .env               # demo values (DB creds, JWT secrets, portal secret, Cashfree, SMTP, demo data)
│   └── package.json
├── crm-angular/                  # Angular 22 CRM (staff-facing)
│   └── src/app/
│       ├── core/                 # services, guards, interceptor, models
│       ├── layout/shell          # sidebar nav
│       └── features/
│           ├── auth/, dashboard/
│           ├── leads/            # list, detail (status workflow, convert), new
│           ├── quotations/       # list, builder, detail
│           ├── bookings/         # list, detail (with Record Payment modal)
│           ├── payments/         # list
│           ├── invoices/         # list (PDF download)
│           ├── reviews/          # list (admin reply, hide/show)
│           └── admin/            # destinations, hotel-rates, car-rates, settings
└── customer-website/             # Static HTML/JS/CSS marketing site + customer portal
    ├── index.html                # TourCRM marketing landing page (SEO / ads)
    ├── portal.html               # customer OTP login
    ├── dashboard.html            # my bookings + public reviews
    ├── booking-detail.html       # detail + Pay (Online / Offline tabs) + Review modals + Invoice download
    ├── reviews.html              # public reviews + agency testimonials
    ├── quote.html                # "Request a demo" form for agencies (creates a lead)
    ├── css/portal.css
    ├── css/marketing.css
    └── js/api.js, auth.js
```

## Quick Start (full stack, demo mode)

### 1. Database (MySQL 8)

```bash
mysql -u root -p1234 < backend/migrations/001_initial_schema.sql
mysql -u root -p1234 tour_crm < backend/migrations/002_bookings.sql
mysql -u root -p1234 tour_crm < backend/migrations/003_sikkim_seed.sql
mysql -u root -p1234 tour_crm < backend/migrations/004_quotation_revisions.sql
mysql -u root -p1234 tour_crm < backend/migrations/005_payments_invoices_reviews.sql
mysql -u root -p1234 tour_crm < backend/migrations/006_agency_settings_extras.sql
mysql -u root -p1234 tour_crm < backend/migrations/007_leads_workflow.sql
```

Or with the helper (if present): `backend/scripts/migrate.sh`

### 2. Backend

```bash
cd backend
npm install
npm run seed:admin   # admin@tourcrm.local / Admin@123
npm run dev          # → http://localhost:3000
```

`.env` ships with demo data (Sikkim Trails Travel, bank details, Cashfree placeholders).
Online payment in demo mode returns a friendly error prompting the customer
to use the offline tab instead.

### 3. CRM Frontend (Angular)

```bash
cd crm-angular
npm install
ng serve             # → http://localhost:4200
```

Login: `admin@tourcrm.local` / `Admin@123`

### 4. Customer Website (static)

```bash
cd customer-website
python -m http.server 8080
# → http://localhost:8080
```

Open `http://localhost:8080/` for the TourCRM marketing landing page, or
`http://localhost:8080/portal.html` to sign in with one of the demo customers:
- `priya.thapa@outlook.com`  (has BKG-2025-0001)
- `rajesh.sharma@gmail.com`  (has BKG-2025-0002)

The dev OTP is shown in the response (`dev_otp` field) and on the login page itself.

---

## API Reference

### Leads (Sales pipeline)
```
GET    /api/leads?status=&source=&assigned_to=&q=&page=&limit=
GET    /api/leads/stats                          # counts by status, source, overdue follow-ups
GET    /api/leads/:id
POST   /api/leads                                # create (staff)
PATCH  /api/leads/:id
POST   /api/leads/:id/assign        { assigned_to }      – reassign (or unassign)
POST   /api/leads/:id/status        { status, note? }   – move through pipeline
POST   /api/leads/:id/convert                          – create draft quotation, mark lead converted
POST   /api/leads/bulk-import                        – CSV upload (multipart field "file")
POST   /api/leads/public         { name, phone, email, destination, … }   – public website form (no auth)
POST   /api/leads/webhook/meta-ads                   – Meta lead-form webhook (HMAC-verified if META_APP_SECRET set)
```

### Staff Auth
```
POST /api/auth/login        { email, password } → { access_token, user }
GET  /api/auth/me           (JWT) → user
```

### Quotations
```
GET    /api/quotations?status=&q=&page=&limit=
POST   /api/quotations
GET    /api/quotations/:id
PATCH  /api/quotations/:id/status        # draft | sent | accepted | rejected | expired
POST   /api/quotations/:id/revise        # clone → new draft, parent → superseded
GET    /api/quotations/stats
GET    /api/quotations/master/hotel-rates?destination_id=
GET    /api/quotations/master/car-rates?destination_id=
GET    /api/quotations/:id/pdf           # PDF download
```

### Bookings
```
GET    /api/admin/bookings?status=&customer=&page=&limit=
GET    /api/admin/bookings/:id           # joins parent quotation line items
PATCH  /api/admin/bookings/:id/status
GET    /api/admin/bookings/:id/payments
GET    /api/admin/bookings/:id/invoices
```

### Payments
```
GET    /api/payments?status=&booking_id=&page=&limit=
GET    /api/payments/:id
POST   /api/payments/record-offline      # staff: cash, bank_transfer, upi, card
POST   /api/payments/create-online-order # staff: opens Cashfree order
POST   /api/payments/cashfree/webhook    # Cashfree callback (HMAC-verified, raw body)
```

### Invoices
```
GET    /api/invoices?status=&page=&limit=
GET    /api/invoices/:id
GET    /api/invoices/:id/download       # staff auth
GET    /api/invoices/booking/:id
GET    /api/portal/invoices/:id/download # customer (portal JWT) auth
```

### Reviews
```
GET    /api/reviews                      # public, visible only
GET    /api/reviews/admin/all            # staff, all reviews
POST   /api/portal/bookings/:id/review   # customer submits (1 per booking)
PATCH  /api/admin/reviews/:id            # staff: visibility / reply
```

### Customer Portal (no staff auth, OTP-based)
```
POST   /api/portal/auth/send-otp         { email } → { dev_otp, expires_in }
POST   /api/portal/auth/verify-otp       { email, code } → { access_token, customer }
GET    /api/portal/me
GET    /api/portal/bookings
GET    /api/portal/bookings/:id          # joins parent quotation + payments + invoices + review
POST   /api/portal/bookings/:id/pay      # create Cashfree order (online)
POST   /api/portal/bookings/:id/pay-offline  # bank-transfer notify (status='created', staff verifies)
GET    /api/portal/invoices/:id/download # customer can download own invoice PDF
```

### Admin (admin/manager role)
```
GET/POST/PATCH  /api/admin/destinations[/:id]
GET/POST/PATCH/DELETE  /api/admin/hotel-rates[/:id]
GET             /api/admin/car-types
GET/POST/PATCH/DELETE  /api/admin/car-rates[/:id]
GET/PATCH       /api/admin/settings
```

---

## Demo Data

| Email | Customer | Booking | Status |
|---|---|---|---|
| priya.thapa@outlook.com | Priya Thapa | BKG-2025-0001 (₹70,894) | confirmed / partial (₹30,000 paid) |
| rajesh.sharma@gmail.com | Rajesh Sharma | BKG-2025-0002 (₹80,497) | confirmed / partial (₹40,249 paid) |

Agency (Sikkim Trails Travel, M.G. Marg, Gangtok), bank, GSTIN, and Cashfree
placeholders all seeded into `agency_settings` and `.env`. The invoice PDFs
print bank details automatically.

---

## Demo-mode behaviour

- **Online payments** in demo mode: Cashfree credentials are placeholders, so
  the API returns 503 `CASHFREE_NOT_CONFIGURED`. The customer-website's pay
  modal has an **Online / Offline** tab — Offline works in any mode.
- **Offline payment** notify inserts a `payments` row with `status='created'`
  and `offline_note` starting with `[PENDING VERIFICATION via customer portal]`.
  Staff opens the booking in the CRM and either marks it `paid` (after bank
  verification) or rejects.
- **OTP emails** in `EMAIL_MODE=console` are logged to the backend console
  AND returned in the `dev_otp` field of the `/send-otp` response for easy
  testing. The customer-website's login page also shows the dev OTP in a
  yellow box when the response contains it.
- **Invoice PDFs** regenerate on demand if missing from disk.

---

## For Production

1. Replace `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` in `backend/.env` with
   real Cashfree sandbox (and later production) keys.
2. Set `EMAIL_MODE=smtp` and configure `SMTP_*` values for transactional OTP
   email delivery (and a separate SMTP for booking/review notifications).
3. Set `CASHFREE_RETURN_URL` to the public customer-portal URL.
4. Set `FRONTEND_URL` and `CUSTOMER_PORTAL_URL` to the deployed origins for
   CORS allow-list.
5. Generate a real `JWT_SECRET` and `PORTAL_JWT_SECRET` (currently demo strings).
6. Use a real invoice storage path (`INVOICE_DIR`) mounted on a persistent
   volume.
7. Configure `WEBHOOK_PUBLIC_URL` so Cashfree can reach `/api/payments/cashfree/webhook`.
8. Move static customer-website to a CDN or nginx with HTTPS.
9. Set `META_APP_SECRET` so the Meta-ads webhook HMAC-verifies properly;
   configure Meta Lead Ads to POST to `<BACKEND_URL>/api/leads/webhook/meta-ads`.
10. Provide a daily or weekly CSV import job for offline lead sources
    (e.g. IndiaMART, Sulekha) that maps their export columns to the CSV format
    this module expects.

---

## Lead sources (ingestion)

| Source | How leads enter | Endpoint |
|---|---|---|
| **Manual** | staff uses CRM "New Lead" form | `POST /api/leads` |
| **Demo request** | anonymous visitor submits `customer-website/quote.html` | `POST /api/leads/public` |
| **CSV upload** | staff uploads a `.csv` from the lead-list page | `POST /api/leads/bulk-import` (multipart) |
| **Meta-ads** | Facebook Lead Ads webhook to the backend | `POST /api/leads/webhook/meta-ads` (HMAC-verified) |
| **Walk-in / phone / WhatsApp / referral / Google Sheet / website form** | staff enters manually and picks the right `source` in the new-lead form | `POST /api/leads` |

CSV upload expects a header row with at minimum `full_name` and `phone`. Optional
columns: `email`, `destination_text`, `source`, `notes`, `follow_up_at`.

The Meta-ads webhook accepts the standard Facebook lead-gen payload format
(`entry[].changes[].value.field_data[]`) and walks it into the same `leads` table.

---

## Schema notes (MySQL port vs the original Postgres plan)

- `INT UNSIGNED AUTO_INCREMENT` instead of `UUID`
- `DECIMAL(10,2)` / `DECIMAL(12,2)` for money
- Native `ENUM` for status fields
- `JSON` (not `JSONB`)
- `TINYINT(1)` for booleans
- Generated columns for `nights` (`DATEDIFF(end, start)`) and `grand_total` (subtotal × markup × (1+gst))
- `SET FOREIGN_KEY_CHECKS = 0` toggles around the schema for idempotent re-runs
