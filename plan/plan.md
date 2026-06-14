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

---

# Future Enhancements Roadmap

The following features are recommended to make TourCRM a best-in-class platform for tour & travel agencies. They are grouped by business area and written so each can be picked up as a standalone implementation phase.

---

## Phase A — Sales & Lead Management

### A.1 Lead Scoring & Auto-assignment
**Goal:** Distribute leads intelligently and surface the hottest opportunities.

**Backend:**
- Add `lead_scores` table / columns: `score`, `score_reasons JSON`.
- Scoring rules: source weight, budget present, destination popularity, response time.
- Round-robin assignment algorithm using `last_assigned_at` on `staff_users`.
- New endpoints:
  - `GET /api/leads/scoring-rules`
  - `PATCH /api/leads/scoring-rules`
  - `POST /api/leads/:id/assign-auto`

**Frontend:**
- Lead list column showing score badge (hot/warm/cold).
- Settings page to configure scoring weights.

### A.2 Follow-up Templates
**Goal:** Faster, consistent outreach.

**Backend:**
- `message_templates` table: `id, company_id, name, channel (email/sms/whatsapp), subject, body, placeholders JSON, is_active`.
- Endpoint: `GET /api/message-templates`, `POST /api/message-templates`.

**Frontend:**
- Template picker in follow-up form.
- Placeholder preview (`{{full_name}}`, `{{destination_text}}`, `{{price}}`).

### A.3 Auto-follow-up Sequences
**Goal:** Nurture leads until they respond.

**Backend:**
- `followup_sequences` and `followup_sequence_steps` tables.
- Node-cron job every hour to enqueue due steps.
- `lead_followup_sequence` link table to track progress.

**Frontend:**
- Sequence builder UI (Day 0 email, Day 2 WhatsApp, Day 5 call task).
- Toggle per lead source.

### A.4 Pipeline Velocity & Conversion Reports
**Goal:** Understand where leads get stuck.

**Backend:**
- `GET /api/reports/pipeline-velocity` — avg days per status transition.
- `GET /api/reports/conversion-funnel` — count by status/source.

**Frontend:**
- Funnel chart and trend line on dashboard.

### A.5 Duplicate Lead Detection
**Goal:** Prevent multiple reps from chasing the same customer.

**Backend:**
- Before insert on `leads`, check phone/email fuzzy match.
- `GET /api/leads/duplicates?phone=&email=`.
- Endpoint `POST /api/leads/:id/merge/:otherId`.

**Frontend:**
- Duplicate warning banner on lead detail/new form.

---

## Phase B — Quotation & Itinerary Builder

### B.1 Quotation Revision Compare
**Goal:** Let customers see exactly what changed between versions.

**Backend:**
- `GET /api/quotations/:id/compare/:versionId` returns normalized diff.

**Frontend:**
- Side-by-side modal in quotation detail.

### B.2 PDF Themes
**Goal:** Professional branded quotes for different segments.

**Backend:**
- `quotation_themes` table and `quotations.theme_id`.
- Server-side PDF renderer selects theme CSS.

**Frontend:**
- Theme dropdown in quotation builder/settings.

### B.3 Supplier Cost & Margin Tracking
**Goal:** Protect margins and track net vs. sell price.

**Backend:**
- Add `net_cost`, `markup_percent`, `margin_amount` to line items.
- `GET /api/reports/margins`.

**Frontend:**
- Show cost, markup, and margin per line item and total.

### B.4 Group / Series Departure Quotes
**Goal:** Sell fixed departures efficiently.

**Backend:**
- Link quotation to `fixed_departures`; enforce min/max pax.
- Auto-price `price_per_person × pax`.

**Frontend:**
- Fixed departure selector in quotation builder.

### B.5 Multi-currency Quotes
**Goal:** Support international customers and suppliers.

**Backend:**
- `currencies` table with exchange rates.
- `quotations.currency_code`, `quotations.exchange_rate`.
- Nightly cron to fetch rates.

**Frontend:**
- Currency selector; show dual currency (e.g. INR + USD).

---

## Phase C — Bookings & Operations

### C.1 Voucher Generation
**Goal:** Generate hotel/car/tour vouchers automatically.

**Backend:**
- `vouchers` table and PDF templates.
- Endpoints: `POST /api/bookings/:id/vouchers`, `GET /api/vouchers/:id/download`.

**Frontend:**
- "Generate Vouchers" button on booking detail.

### C.2 Pre-travel Task Checklist
**Goal:** Never miss a critical step.

**Backend:**
- `booking_tasks` table: `title, due_before_days, is_completed, completed_by, completed_at`.
- Default templates per package type.

**Frontend:**
- Checklist widget on booking detail; dashboard overdue tasks.

### C.3 Document Uploads
**Goal:** Centralize passports, tickets, insurance.

**Backend:**
- `booking_documents` table and secure upload path.
- `POST /api/bookings/:id/documents` (multipart).

**Frontend:**
- Drag-drop upload and document list.

### C.4 Traveller Manifest
**Goal:** Passenger details for bookings and vendor sharing.

**Backend:**
- `travellers` table linked to bookings.
- `GET /api/bookings/:id/manifest` PDF.

**Frontend:**
- Add/edit travellers modal; manifest preview.

### C.5 Booking Timeline / Activity Feed
**Goal:** Full audit trail per booking.

**Backend:**
- Extend `audit_log` to capture booking events automatically.
- `GET /api/bookings/:id/timeline`.

**Frontend:**
- Timeline component on booking detail.

---

## Phase D — Payments & Finance

### D.1 Payment Reminders
**Goal:** Reduce overdue balances automatically.

**Backend:**
- Cron job checks bookings with balance due X days before departure.
- Sends email/WhatsApp reminder using templates.
- Logs reminder in `audit_log`.

**Frontend:**
- Settings: configure reminder schedule.

### D.2 Installment Payment Schedules
**Goal:** Structured payment plans.

**Backend:**
- `payment_schedules` table: `installment_number, due_date, percent, amount, is_paid`.
- Validate payments against schedule.

**Frontend:**
- Schedule builder in quotation/booking.

### D.3 Expense Tracking
**Goal:** True profitability per trip.

**Backend:**
- `booking_expenses` table: `category, amount, vendor, description, receipt_url`.
- `GET /api/bookings/:id/expenses`.

**Frontend:**
- Expense form and list; net profit summary.

### D.4 GST Reports
**Goal:** Tax compliance for Indian agencies.

**Backend:**
- `GET /api/reports/gst?from=&to=` with HSN/SAC, taxable, IGST/SGST/CGST split.
- Reuse invoice totals.

**Frontend:**
- GST report page with export to Excel/CSV.

### D.5 Profitability Per Booking
**Goal:** Know which trips actually made money.

**Backend:**
- Computed view: revenue - expenses - refunds = net profit.
- `GET /api/reports/booking-profitability`.

**Frontend:**
- Profit badge on booking list and detail.

---

## Phase E — Marketing & Website

### E.1 Landing Page Builder
**Goal:** Agencies create campaign pages without developers.

**Backend:**
- `landing_pages` table: `slug, title, content_blocks JSON, seo_meta JSON, is_published`.
- Public endpoint `GET /api/landing-pages/:slug`.

**Frontend (CRM):**
- Drag-and-drop block editor.

**Frontend (public):**
- Render published page and capture leads into CRM.

### E.2 Review Widget Embed
**Goal:** Show verified reviews on agency websites.

**Backend:**
- `GET /api/reviews/widget?company_id=&limit=` returns JS snippet.

**Frontend:**
- Copy-paste embed code in settings.

### E.3 Referral Program
**Goal:** Incentivize word-of-mouth.

**Backend:**
- `referral_codes` and `referral_rewards` tables.
- Apply discount at quotation level.

**Frontend:**
- Referral dashboard and code generator.

### E.4 Coupon / Promo Codes
**Goal:** Run seasonal campaigns.

**Backend:**
- `promo_codes` table: `code, discount_type, discount_value, valid_from, valid_to, max_uses`.
- Apply during quotation/booking creation.

**Frontend:**
- Promo code input in quotation builder.

### E.5 SEO Blog / Destination Guides
**Goal:** Inbound lead generation.

**Backend:**
- `cms_posts` table with SEO fields.
- Public listing and detail endpoints.

**Frontend (public):**
- Blog listing and article pages on the marketing website.

---

## Phase F — Integrations

### F.1 WhatsApp Business API
**Goal:** Send quotes, reminders, and updates on WhatsApp.

**Backend:**
- `whatsapp_configs` table (already exists); add message queue.
- `POST /api/whatsapp/send` with template approval handling.

**Frontend:**
- WhatsApp send buttons on lead/booking.

### F.2 Additional Payment Gateways
**Goal:** Customer choice and redundancy.

**Backend:**
- Refactor payment service to support Razorpay, PayU, Stripe.
- `payments.gateway` enum extended.

**Frontend:**
- Gateway selector in payment modal.

### F.3 Accounting Software Export
**Goal:** Streamline bookkeeping.

**Backend:**
- `GET /api/invoices/export/tally` or `/zohobooks`.
- CSV/JSON mapping for invoices and payments.

**Frontend:**
- Export button on invoices page.

### F.4 Calendar Sync
**Goal:** Follow-ups and trip dates in staff calendars.

**Backend:**
- Generate ICS files or Google Calendar API integration.
- `GET /api/calendar/feed?token=`.

**Frontend:**
- Subscribe link in user settings.

### F.5 Meta & Google Lead Form Sync
**Goal:** Direct ad-to-CRM pipeline.

**Backend:**
- Extend Meta webhook to handle more lead form fields.
- Add Google Lead Form webhook endpoint with validation.

---

## Phase G — Analytics & Reporting

### G.1 Revenue Forecasting
**Goal:** Predict cash flow from pipeline.

**Backend:**
- Weighted forecast by status probability.
- `GET /api/reports/revenue-forecast`.

**Frontend:**
- Forecast chart on dashboard.

### G.2 Sales Leaderboard
**Goal:** Motivate and manage sales teams.

**Backend:**
- Aggregate conversions and revenue per staff user.
- `GET /api/reports/sales-performance`.

**Frontend:**
- Leaderboard widget.

### G.3 Lead Source ROI
**Goal:** Optimize ad spend.

**Backend:**
- Link bookings to original source; compute bookings per source.
- `GET /api/reports/source-roi`.

**Frontend:**
- Source comparison table/chart.

### G.4 Destination Performance
**Goal:** Identify winning packages.

**Backend:**
- `GET /api/reports/destinations` with revenue, bookings, margin.

**Frontend:**
- Destination ranking dashboard.

### G.5 Cancellation & No-show Analytics
**Goal:** Reduce losses.

**Backend:**
- `GET /api/reports/cancellations` with reasons and refund amounts.

**Frontend:**
- Cancellation trend report.

---

## Phase H — Collaboration & Team

### H.1 Internal Notes & @Mentions
**Goal:** Team communication around leads/bookings.

**Backend:**
- `notes` table with `mentions` JSON; notification queue.

**Frontend:**
- Mention autocomplete in notes.

### H.2 Role-based Dashboards
**Goal:** Relevant view for each role.

**Frontend:**
- Sales dashboard: pipeline, reminders, leaderboard.
- Operations dashboard: upcoming trips, tasks, vouchers.
- Accounts dashboard: pending payments, GST, invoices.

### H.3 Mobile PWA
**Goal:** Field staff access.

**Frontend:**
- Add service worker, manifest, responsive layouts.
- Push notifications for reminders.

### H.4 Shift Handover Report
**Goal:** Smooth telecaller transitions.

**Backend:**
- `GET /api/reports/handover` summarizing today's calls and tomorrow's follow-ups.

**Frontend:**
- Printable handover page.

---

## Phase I — Customer Experience

### I.1 Trip Countdown Widget
**Goal:** Build excitement and reduce pre-trip anxiety.

**Frontend (portal):**
- Show days until trip, weather placeholder, packing checklist.

### I.2 Post-trip NPS Survey
**Goal:** Measure and improve service.

**Backend:**
- `nps_responses` table.
- Cron sends survey 3 days after trip end.

**Frontend (portal):**
- 0–10 NPS form with comment.

### I.3 Loyalty / Rewards Program
**Goal:** Drive repeat bookings.

**Backend:**
- `loyalty_points` table; accrue on paid bookings; redeem as discounts.

**Frontend:**
- Points display in portal; apply points at checkout.

### I.4 Group Announcements
**Goal:** Broadcast updates to all travellers.

**Backend:**
- `booking_announcements` table.
- Email/WhatsApp blast endpoint.

**Frontend:**
- Announcement composer on booking detail.

---

## Phase J — SaaS Platform (Super Admin)

### J.1 White-label Domains
**Goal:** Agencies use their own brand.

**Backend:**
- `companies.custom_domain` with domain verification.
- Nginx/Express host header routing.

### J.2 Usage Alerts
**Goal:** Reduce churn and drive upgrades.

**Backend:**
- Cron checks usage vs. limits; email agency admin at 80%, 100%.

### J.3 Auto-invoicing for Tenants
**Goal:** Automated SaaS billing.

**Backend:**
- Monthly cron creates `company_invoices` based on active subscriptions.

### J.4 Per-company Backup / Restore
**Goal:** Data portability and disaster recovery.

**Backend:**
- Export tenant data to JSON/ZIP.
- Restore endpoint for super admin.

---

## Recommended Implementation Order

| Priority | Phase | Why First |
|----------|-------|-----------|
| 1 | D.1 Payment reminders | Quick win, improves cash flow |
| 2 | A.2 Follow-up templates | Reduces sales effort immediately |
| 3 | A.3 Auto-follow-up sequences | Converts more leads automatically |
| 4 | C.2 Booking task checklist | Reduces operational mistakes |
| 5 | F.1 WhatsApp integration | High-impact channel for travel agencies |
| 6 | D.4 GST reports | Compliance necessity for Indian agencies |
| 7 | D.5 Profitability per booking | Core agency metric |
| 8 | G.2 Sales leaderboard + G.3 Source ROI | Management visibility |
| 9 | E.1 Landing page builder | Drives inbound leads |
| 10 | J.1 White-label domains | Enterprise/SaaS selling point |
