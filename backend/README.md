# Tour CRM — Backend (Quotation Module)

Node.js + Express + MySQL API.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create database & run schema (one-time)
mysql -u root -p < migrations/001_initial_schema.sql

# 3. Copy env and edit credentials
cp .env.example .env
# edit DB_USER, DB_PASSWORD, JWT_SECRET, ...

# 4. Create an admin user
npm run seed:admin
# default: admin@tourcrm.local / Admin@123

# 5. Start
npm run dev   # nodemon
# or
npm start
```

API runs on `http://localhost:3000`.

## Endpoints (Quotation module)

### Auth
- `POST /api/auth/login` — `{ email, password }` → `{ access_token, user }`
- `GET  /api/auth/me` — current user (JWT)

### Quotations
- `GET  /api/quotations?status=&q=&page=&limit=`
- `POST /api/quotations` — create with `hotels[]`, `cars[]`, `flights[]`, `misc[]`
- `GET  /api/quotations/:id` — full with line items
- `PATCH /api/quotations/:id/status` — `{ status: 'draft'|'sent'|'accepted'|'rejected'|'expired' }`
- `GET  /api/quotations/stats` — counts
- `GET  /api/quotations/master/hotel-rates?destination_id=`
- `GET  /api/quotations/master/car-rates?destination_id=`

### Admin (admin/manager only)
- `GET/POST/PATCH /api/admin/destinations[/:id]`
- `GET/POST/PATCH/DELETE /api/admin/hotel-rates[/:id]`
- `GET /api/admin/car-types`
- `GET/POST/PATCH/DELETE /api/admin/car-rates[/:id]`
- `GET/PATCH /api/admin/settings`
