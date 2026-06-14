# Tour & Travel Agency CRM — Master Project Plan

## Overview

A full-stack CRM system for managing tour and travel operations, consisting of:
- **CRM Application** — Angular 22 (staff-facing: lead management, quotations, bookings)
- **Customer Portal Website** — Plain HTML + Vanilla JS + CSS (customer-facing: view booking, pay online)
- **Backend REST API** — Node.js + Express + PostgreSQL
- **Payment** — Cashfree Payment Gateway
- **PDF Generation** — pdfmake (browser-side)

---

## Repository Structure

```
tour-travel-crm/
├── backend/                    # Node.js + Express REST API
│   ├── src/
│   │   ├── config/             # DB, env, constants
│   │   ├── controllers/        # Route handlers
│   │   │   ├── leads.controller.js
│   │   │   ├── quotations.controller.js
│   │   │   ├── bookings.controller.js
│   │   │   ├── payments.controller.js
│   │   │   ├── portal.controller.js
│   │   │   └── admin.controller.js
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── models/             # DB query helpers (pg pool)
│   │   ├── routes/             # Express router files
│   │   ├── services/           # Business logic
│   │   │   ├── google-sheets.service.js
│   │   │   ├── email-otp.service.js
│   │   │   ├── cashfree.service.js
│   │   │   └── pdf.service.js
│   │   ├── jobs/               # Cron jobs (Google Sheets sync)
│   │   └── app.js              # Express app entry
│   ├── migrations/             # SQL migration files
│   │   └── 001_initial_schema.sql
│   ├── .env.example
│   └── package.json
│
├── crm-angular/                # Angular 22 CRM (staff)
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/           # Auth, guards, interceptors, services
│   │   │   ├── shared/         # Shared components, pipes, directives
│   │   │   ├── features/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── leads/      # Lead list, detail, follow-up log
│   │   │   │   ├── quotations/ # Multi-step quotation builder
│   │   │   │   ├── bookings/   # Booking management
│   │   │   │   ├── invoices/   # Invoice view + PDF
│   │   │   │   └── admin/      # Master data management
│   │   │   └── layout/         # Shell, sidebar, nav
│   │   ├── environments/
│   │   └── styles/
│   ├── angular.json
│   └── package.json
│
├── customer-website/           # Plain HTML/JS/CSS portal
│   ├── index.html              # Login (email OTP)
│   ├── dashboard.html          # Booking dashboard
│   ├── booking-detail.html     # Single booking + payment
│   ├── css/
│   │   ├── main.css
│   │   └── portal.css
│   └── js/
│       ├── auth.js             # OTP login flow
│       ├── api.js              # fetch() wrapper with JWT
│       ├── dashboard.js
│       ├── booking.js
│       └── payment.js          # Cashfree SDK integration
│
├── shared/                     # Shared TypeScript types
│   └── types/
│       ├── lead.types.ts
│       ├── quotation.types.ts
│       └── booking.types.ts
│
└── docker-compose.yml          # PostgreSQL + API for local dev
```

---

## Phase Execution Plan

### Phase 1 — Backend Foundation (Weeks 1–3)

**Deliverables:**
- PostgreSQL schema created and migrated
- Express app scaffolded with middleware (JWT auth, CORS, error handler)
- Environment config (`.env`) for DB, JWT secret, email service, Cashfree keys
- Health check endpoint `GET /api/health`

**Tasks:**
1. Create PostgreSQL database and run `001_initial_schema.sql`
2. Set up Express app with `pg` connection pool
3. Implement JWT middleware (CRM staff auth)
4. Implement role-based access control middleware (Admin, Manager, Telecaller)
5. Create base CRUD for all master tables (destinations, hotel_rates, car_rates)

**Environment Variables (`.env.example`):**
```
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/tour_crm
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_SECRET=your_refresh_secret
EMAIL_API_KEY=your_sendgrid_or_brevo_key
EMAIL_FROM=noreply@youragency.com
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret
CASHFREE_ENV=TEST   # or PROD
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google-service-account.json
FRONTEND_URL=http://localhost:4200
CUSTOMER_PORTAL_URL=http://localhost:8080
```

---

### Phase 2 — Lead Ingestion Module (Weeks 3–4)

**Deliverables:**
- All 4 lead sources feeding the `leads` table
- Deduplication logic (by phone + email)
- Source tagging on every lead record

**Sub-tasks:**

#### 2a. Google Sheets API Sync
- Create Google Cloud service account, download JSON credentials
- Configure `google-sheets.service.js` with `googleapis` npm package
- Read sheet via OAuth2, map rows to lead fields, skip duplicates
- Cron job (node-cron): runs every 15 minutes
- Store `last_synced_row` in a `sync_state` table to avoid re-importing

#### 2b. Website Form Webhook
- `POST /api/leads/webhook` with shared secret header validation
- HTML form on customer website uses `fetch()` to POST lead data
- Rate limiting on this endpoint (express-rate-limit)

#### 2c. CSV Upload
- Angular component with drag-drop file zone
- `POST /api/leads/bulk` accepts JSON array (frontend parses CSV with Papa Parse)
- Backend validates, deduplicates, and inserts in batch
- Returns import summary (imported / skipped / errors)

#### 2d. Manual Entry
- Angular reactive form (LeadCreateComponent)
- `POST /api/leads` with full validation

---

### Phase 3 — Follow-up & Lead Management (Weeks 4–5)

**Deliverables:**
- Lead list with filters, sorting, pagination
- Lead detail view with follow-up timeline
- Status management (hot/warm/cold/junked/follow-later)
- Follow-up reminder dashboard

**API Endpoints:**
```
GET    /api/leads                    # list with filters
GET    /api/leads/:id                # lead detail
PATCH  /api/leads/:id/status        # update status
POST   /api/leads/:id/follow-ups    # log a follow-up
GET    /api/leads/:id/follow-ups    # follow-up history
GET    /api/leads/reminders/today   # due follow-ups for today
```

**Angular Components:**
- `LeadListComponent` — paginated table, filter bar, bulk assign
- `LeadDetailComponent` — contact info, status badge, follow-up timeline
- `FollowUpFormComponent` — modal: call outcome, notes, next follow-up date
- `RemindersComponent` — dashboard widget for today's due follow-ups

---

### Phase 4 — Quotation Builder (Weeks 5–8)

This is the core complex module. Built as a multi-step Angular form using Angular CDK Stepper.

**API Endpoints:**
```
GET    /api/quotations              # list
POST   /api/quotations             # create new quotation
GET    /api/quotations/:id         # get with all line items
PATCH  /api/quotations/:id        # update (creates new version)
POST   /api/quotations/:id/send   # email PDF to customer
GET    /api/admin/hotel-rates      # master rates by destination
GET    /api/admin/car-rates        # master rates by location
```

**Step 1 — Trip Details:**
- Destination (dropdown populated from `destinations` table)
- Trip start date / end date (auto-calculates nights)
- Adults, children under 5, children over 5
- Number of rooms
- Package type: checkbox group (Hotel, Car, Flight — any combination)

**Step 2 — Hotel Block** (visible if Hotel or Hotel+Car selected):
- Auto-fetch rates for chosen destination from `hotel_rates` master
- Fields: hotel name (text), star rating, room type (dropdown from master), charge per night (pre-filled, editable), meal plan (None / Breakfast / Breakfast+Dinner), number of nights (auto from dates, editable), special request charges
- "Add another hotel" (multi-hotel support per trip)

**Step 3 — Car/Cab Block** (visible if Car or Hotel+Car selected):
- Auto-fetch rates from `car_rates` master for destination
- Fields: car type (dropdown), class (Premium/Luxury/Standard), daily rate (pre-filled, editable), number of days, KM limit display, extra-KM rate
- "Add another car" support

**Step 4 — Flight Block** (visible if Flight selected):
- Airline, route, departure date, fare per adult, fare per child, total

**Step 5 — Miscellaneous:**
- Guide charges
- Entrance & monument fees
- Other charges (freeform line items with label + amount)
- Profit markup % (applied to sum of all above before tax)
- GST % (optional)

**Step 6 — Review & Send:**
- Itemized grand total table
- Quotation valid till date
- Notes / terms for customer
- Generate PDF (pdfmake) — branded with agency logo
- Send to customer via email
- Save as draft or finalize

**Quotation Versioning:**
Each save creates a new `quotation_versions` record. The `quotations` table holds the latest version pointer. This lets staff see revision history.

---

### Phase 5 — Booking & Invoice (Weeks 8–9)

**Flow:**
1. Staff marks quotation as "accepted" → booking record auto-created
2. Booking confirmation page: summary of trip, total amount, booking fee due
3. Booking fee: configurable % of total (or fixed amount)
4. Payment options: online (Cashfree) or offline (cash/bank transfer marked manually)
5. Invoice auto-generated on first payment

**API Endpoints:**
```
POST   /api/bookings                # create from quotation_id
GET    /api/bookings                # list with filters
GET    /api/bookings/:id           # booking detail
PATCH  /api/bookings/:id/status   # confirm/cancel/complete
POST   /api/bookings/:id/payments # record offline payment
GET    /api/invoices/:booking_id  # get invoice
```

**Invoice Fields:**
- Invoice number (auto-generated: `INV-YYYY-XXXX`)
- Agency name/address/GSTIN
- Customer name/address
- Booking details (dates, destination, pax)
- Itemized charges (mirrors quotation)
- GST breakup (CGST + SGST or IGST)
- Total paid / balance due
- Payment terms

---

### Phase 5.5 — SaaS Onboarding & Subscription Management (Weeks 9)

**Deliverables:**
- Public signup API for new agencies
- Subscription package catalog endpoint
- Trial onboarding and company approval workflow
- Super-admin package approval and company activation
- Tenant billing state transitions: `trial`, `active`, `expired`, `cancelled`

**API Endpoints:**
```
POST  /api/auth/signup                # public tenant signup
GET   /api/subscription-packages      # public package catalog
POST  /api/super-admin/companies      # super-admin company approval
POST  /api/super-admin/companies/:id/toggle-status # activate/suspend tenant
GET   /api/usage                      # tenant usage and quota status
```

**Tasks:**
1. Add public signup route and validation in auth module.
2. Create initial company record and admin user with `pending` status.
3. Assign default trial package or selected public package.
4. Expose package catalog to public clients.
5. Build super-admin approval flow for tenant activation.
6. Add billing state guard to prevent expired/trial tenants from using the CRM.

---

### Phase 6 — Customer Portal (Weeks 9–10)

Plain HTML/CSS/JS — no framework dependency.

**Pages:**

**`index.html` — Login:**
- Email input → "Send OTP" → 6-digit OTP input → verify
- On success: receive JWT → store in `sessionStorage`
- Redirect to `dashboard.html`

**`dashboard.html` — My Bookings:**
- Header with customer name, logout
- Cards for each booking: destination, dates, status badge, total, amount paid
- Click card → `booking-detail.html?id=XXX`

**`booking-detail.html` — Booking Detail:**
- Full itinerary breakdown
- Quotation line items
- Payment history table
- Outstanding balance
- "Pay Now" button → Cashfree SDK modal

**API Endpoints (portal — separate auth):**
```
POST   /api/portal/auth/send-otp    # send OTP to email
POST   /api/portal/auth/verify-otp  # verify OTP, return JWT
GET    /api/portal/bookings         # customer's bookings
GET    /api/portal/bookings/:id    # booking detail
POST   /api/portal/payments/create-order  # create Cashfree order
GET    /api/portal/invoices/:id    # download invoice PDF
```

---

### Phase 7 — Payment Integration (Cashfree) (Week 10)

**Backend:**
1. `POST /api/portal/payments/create-order` — calls Cashfree Orders API, returns `payment_session_id`
2. `POST /api/payments/cashfree-webhook` — receives Cashfree webhook, verifies signature, updates `payments` table and booking status
3. `GET /api/portal/payments/:order_id/status` — poll payment status

**Frontend (customer-website/js/payment.js):**
```javascript
// Load Cashfree JS SDK
const cashfree = await load({ mode: "production" }); // or "sandbox"
const result = await cashfree.checkout({
  paymentSessionId: sessionId,
  redirectTarget: "_modal"
});
```

**Webhook Signature Verification:**
Use `crypto.createHmac('sha256', secretKey)` to verify Cashfree webhook payload.

---

### Phase 8 — Admin Master Module (Week 10–11)

**Angular Admin screens:**

| Screen | Route | Description |
|--------|-------|-------------|
| Destinations | /admin/destinations | Add/edit/archive destinations |
| Hotel Rates | /admin/hotel-rates | Rate grid by destination + room type |
| Car Rates | /admin/car-rates | Rate grid by car type + location |
| Users | /admin/users | CRM staff management + roles |
| Settings | /admin/settings | Booking fee %, GST %, default markup |

---

## API Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | Public | CRM staff login |
| POST | /api/auth/refresh | JWT | Refresh token |
| GET | /api/leads | Telecaller+ | List leads |
| POST | /api/leads | Telecaller+ | Create lead |
| PATCH | /api/leads/:id/status | Telecaller+ | Update status |
| POST | /api/leads/:id/follow-ups | Telecaller+ | Log follow-up |
| GET | /api/quotations | Telecaller+ | List quotations |
| POST | /api/quotations | Telecaller+ | Create quotation |
| POST | /api/quotations/:id/send | Telecaller+ | Email to customer |
| GET | /api/bookings | Manager+ | List bookings |
| POST | /api/bookings | Manager+ | Create booking |
| GET | /api/admin/hotel-rates | Admin | Hotel master rates |
| POST | /api/admin/hotel-rates | Admin | Add rate |
| GET | /api/admin/car-rates | Admin | Car master rates |
| POST | /api/portal/auth/send-otp | Public | Customer OTP |
| POST | /api/portal/auth/verify-otp | Public | Verify OTP |
| GET | /api/portal/bookings | Portal JWT | Customer bookings |
| POST | /api/portal/payments/create-order | Portal JWT | Initiate payment |
| POST | /api/payments/cashfree-webhook | Cashfree sig | Payment webhook |

---

## Security Checklist

- [ ] All CRM endpoints behind JWT middleware
- [ ] Role checks on Admin-only routes
- [ ] Customer portal uses separate JWT secret and token space
- [ ] Cashfree webhook verified with HMAC signature
- [ ] Google Sheets webhook uses shared secret header
- [ ] Rate limiting on OTP send endpoint (max 3/hour per email)
- [ ] SQL injection: use parameterized queries (`$1, $2` with `pg`)
- [ ] CORS: restrict to known frontend origins
- [ ] Helmet.js for HTTP security headers
- [ ] Input validation with Joi or Zod on all POST/PATCH endpoints
- [ ] File upload validation (CSV only, max 5MB)

---

## Third-party Services Setup

### Cashfree
1. Create account at cashfree.com
2. Get App ID + Secret Key from dashboard
3. Use sandbox for development, switch to production before go-live
4. Configure webhook URL in Cashfree dashboard: `https://yourdomain.com/api/payments/cashfree-webhook`

### Email (Brevo / SendGrid)
1. Create transactional email account
2. Verify sending domain (add SPF + DKIM DNS records)
3. Create email templates: OTP, booking confirmation, quotation email
4. Store API key in `.env`

### Google Sheets API
1. Create Google Cloud project
2. Enable Google Sheets API
3. Create Service Account → download JSON key
4. Share the lead collection sheet with the service account email

---

## Deployment Architecture (Production)

```
Internet
    │
    ├── Customer Portal Website  → Static hosting (Netlify / Nginx)
    ├── CRM Angular App          → Static hosting (Nginx / Firebase)
    └── Backend API              → Node.js server (VPS / Docker)
                                    │
                                    └── PostgreSQL (managed DB or same VPS)
```

**Recommended:** Single VPS (4GB RAM, 2 vCPU) with Nginx as reverse proxy + PM2 for Node.js process management + daily pg_dump for backups.

---

## Development Timeline

| Week | Milestone |
|------|-----------|
| 1–2 | DB schema + backend scaffold + auth |
| 3 | Lead ingestion (all 4 sources) |
| 4–5 | Follow-up module + lead management |
| 5–8 | Quotation builder (complex) |
| 8–9 | Booking + invoice module |
| 9–10 | Customer portal website |
| 10 | Cashfree payment integration |
| 10–11 | Admin master module |
| 11–12 | Testing, bug fixes, deployment |

**Total estimated timeline: 12 weeks**
