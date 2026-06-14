# Tour & Travel Agency CRM

A full-stack CRM for managing tour leads, quotations, bookings, and customer payments.

## Stack

| Layer | Tech |
|-------|------|
| CRM Frontend | Angular 22 (standalone, signals) |
| Customer Portal | Plain HTML + Vanilla JS |
| Backend API | Node.js + Express |
| Database | PostgreSQL 16 |
| Payment | Cashfree |
| Email | Brevo / SendGrid (SMTP) |

---

## Quick Start (Local Dev)

### 1. Start PostgreSQL with Docker

```bash
docker-compose up postgres -d
```

The schema (`001_initial_schema.sql`) runs automatically on first start.

### 2. Backend API

```bash
cd backend
cp .env.example .env
# Edit .env with your keys
npm install
npm run dev
# API runs on http://localhost:3000
```

### 3. Create admin user (one-time)

```bash
# Run this in psql or pg client:
INSERT INTO staff_users (full_name, email, phone, role, password_hash)
VALUES (
  'Admin User',
  'admin@youragency.com',
  '9999999999',
  'admin',
  '$2b$10$...'  -- Use bcryptjs to hash your password first
);
```

Or use the script:
```bash
cd backend
node -e "
const bcrypt = require('bcryptjs');
const db = require('./src/config/db');
bcrypt.hash('Admin@123', 10).then(hash => {
  db.query('INSERT INTO staff_users (full_name, email, phone, role, password_hash) VALUES (\$1,\$2,\$3,\$4,\$5)',
    ['Admin', 'admin@youragency.com', '9999999999', 'admin', hash]).then(() => { console.log('Done'); process.exit(); });
});
"
```

### 4. Angular CRM

```bash
cd crm-angular
npm install
ng serve
# CRM runs on http://localhost:4200
```

### 5. Customer Portal

Serve the `customer-website/` folder with any static server:
```bash
cd customer-website
npx serve .
# Portal runs on http://localhost:3000 (change port as needed)
```

---

## Lead Ingestion Setup

### Google Sheets (Meta Ads leads)
1. Create Google Cloud project, enable Sheets API
2. Create Service Account → download `credentials.json`
3. Place it at `backend/credentials/google-service-account.json`
4. Share your lead sheet with the service account email
5. Set `GOOGLE_SHEET_ID` and `GOOGLE_SHEETS_CREDENTIALS_PATH` in `.env`
6. Sync runs automatically every 15 minutes

**Expected Sheet columns:** Name | Email | Phone | AlternatPhone | Destination | TravelDate | Adults | Children | Budget | AdID

### Website Form Webhook
```html
<!-- Add to your website contact form -->
<script>
fetch('https://api.yourdomain.com/api/leads/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-webhook-secret': 'YOUR_WEBHOOK_SECRET'
  },
  body: JSON.stringify({
    full_name: form.name,
    phone: form.phone,
    email: form.email,
    destination_text: form.destination,
    travel_date_approx: form.travel_date
  })
});
</script>
```

---

## Cashfree Setup

1. Create account at [cashfree.com](https://cashfree.com)
2. Get App ID + Secret Key
3. Set in `.env`: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=TEST`
4. Configure webhook in Cashfree dashboard: `https://api.yourdomain.com/api/payments/cashfree-webhook`
5. Change `CASHFREE_ENV=PROD` and update SDK mode to `'production'` in `booking-detail.html` before go-live

---

## API Docs (Summary)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/auth/login | — | CRM staff login |
| GET | /api/leads | JWT | List leads |
| POST | /api/leads | JWT | Create lead |
| POST | /api/leads/bulk | JWT | CSV import |
| POST | /api/leads/webhook | Secret | Website form |
| POST | /api/leads/:id/follow-ups | JWT | Log follow-up |
| POST | /api/quotations | JWT | Create quotation |
| PATCH | /api/quotations/:id/status | JWT | Accept/reject |
| POST | /api/bookings | JWT | Create booking |
| POST | /api/bookings/:id/payments/offline | JWT | Record payment |
| POST | /api/portal/auth/send-otp | — | Customer OTP |
| POST | /api/portal/auth/verify-otp | — | Verify OTP |
| GET | /api/portal/bookings | Portal JWT | Customer bookings |
| POST | /api/portal/payments/create-order | Portal JWT | Cashfree order |
| POST | /api/payments/cashfree-webhook | CF sig | Payment webhook |

---

## Folder Structure

```
tour-travel-crm/
├── backend/               # Node.js + Express API
│   ├── migrations/        # SQL schema
│   ├── src/
│   │   ├── config/        # DB pool, env
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # JWT auth
│   │   ├── routes/        # Express routers
│   │   ├── services/      # Email
│   │   └── jobs/          # Cron jobs
│   └── .env.example
├── crm-angular/           # Angular 22 CRM
│   └── src/app/
│       ├── core/          # Auth, interceptors, guards
│       ├── features/      # Pages: dashboard, leads, quotations, bookings, admin
│       └── layout/        # Shell + sidebar
├── customer-website/      # Plain HTML/CSS/JS portal
└── docker-compose.yml
```
