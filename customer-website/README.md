# Customer Website — Sikkim Trails Travel

Static HTML/JS/CSS portal for customers. **No build step** — just serve the folder.

## What it does

- **OTP login** (`index.html`) — customer enters email, receives a 6-digit code, signs in
- **My bookings** (`dashboard.html`) — list of this customer's trips
- **Booking detail** (`booking-detail.html`) — full trip info + pay online (Cashfree) + leave a review
- **Public reviews** (`reviews.html`) — read-only list of customer testimonials

## How to run

```bash
# From the project root
cd customer-website
python -m http.server 8080
# OR (Node)
npx http-server -p 8080
```

Open http://localhost:8080/

The backend must be running at http://localhost:3000/ — the portal calls
`http://localhost:3000/api/portal/*` and `/api/invoices/*` etc. (edit `window.API_BASE`
in the page `<head>` if you change the backend URL).

## Configuration

All backend config lives in `backend/.env`:

- `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV` — sandbox values are placeholders
- `CASHFREE_RETURN_URL` — where Cashfree redirects after payment
- `PORTAL_JWT_SECRET` — secret for the portal JWT (separate from staff JWT)
- `EMAIL_MODE=console` — OTPs are logged to the backend console; the page also shows them in a yellow box for easy testing
- `FRONTEND_URL` / `CUSTOMER_PORTAL_URL` — CORS allow-list

## Demo data

Demo values live in `backend/.env` under `DEMO_AGENCY_*` and in `backend/migrations/003_sikkim_seed.sql`:

- Agency: **Sikkim Trails Travel**, M.G. Marg, Gangtok
- Phone: +91 98765 43210 • Alt: +91 98321 23456
- Email: bookings@sikkimtrails.demo
- GSTIN: 11AAAAA0000A1Z5
- Bank: State Bank of Sikkim • A/C 37123456789 • IFSC SBIS0000123

The two seeded customer accounts:

| Email | Customer | Has booking |
|-------|----------|-------------|
| priya.thapa@outlook.com | Priya Thapa | BKG-2025-0001 (₹70,894) |
| rajesh.sharma@gmail.com | Rajesh Sharma | BKG-2025-0002 (₹80,497) |

Use either to test the OTP flow.

## File map

```
customer-website/
├── index.html              # OTP login
├── dashboard.html          # My bookings + recent reviews
├── booking-detail.html     # Per-booking detail with Pay + Review
├── reviews.html            # Public review list
├── css/portal.css          # All styles
└── js/
    ├── api.js              # Fetch wrapper, attaches portal JWT
    └── auth.js             # Token storage, topbar user, helpers (formatINR, formatDate, etc.)
```

## Notes

- The Cashfree SDK is loaded from `https://sdk.cashfree.com/js/v3/cashfree.js`.
  If the customer is offline it fails to load, but the API will still create
  a `created`-state order on the backend (so you can see the full flow in dev).
- Reviews are moderated by agency staff before going public (default visible,
  staff can hide with one click from the CRM).
- The portal session is a separate JWT (`PORTAL_JWT_SECRET`) from the staff
  session — a leak of one does not compromise the other.
