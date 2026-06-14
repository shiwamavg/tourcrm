# Tour CRM SaaS Transformation Plan

## Competitor Analysis

### helloGTX (hellogtx.com)
**Core Features:**
- Lead management & generation (website, landing pages, Facebook, Google ads)
- WhatsApp API integration (broadcasts, chat bots, auto proposals, vouchers, team chat)
- Query management with 2-minute proposals (Visa, Hotel, Flight, tour packages)
- Follow-ups with alerts for unattended queries
- Invoicing with payment gateway integration
- Reporting (by employees, destination, business volume, sales)
- Customer profiling for personalized servicing
- Email designer with ready templates
- Landing page builder (high conversion for Visa & Packages)
- Intelligent campaigns (email, SMS with tracking, analytics)
- Auto reminders (birthday, anniversary, passport expiry)
- Dynamic website builder (B2C & B2B, SEO ready, online booking, inventory management)
- Itinerary builder (6lac+ hotels, 8k+ sightseeing ready content)
- Fixed departures with inventory and real-time booking
- Auto pricing with contracted hotel and transport rates
- Push itineraries to website
- Operations management (team requests for proposals)
- B2B network (share deals, source deals, get free leads)
- Supplier management (send queries to multiple suppliers)
- Currency management (API based)
- Auto detection of user actions with automation

### TravoCRM (travocrm.com)
**Core Features:**
- Itineraries and quotations (day-wise, PDF format)
- Hotel, transport, flight voucher creation
- GST invoices, receipts, credit notes
- Visa and traveller profile management
- 50+ reports for analysis
- Promotion flyers creation
- Digital planner for team schedule
- WhatsApp, SMS & Email directly from CRM
- Supplier profile management
- Bulk SMS & Email sender
- Auto lead creation from digital marketing & website
- Dynamic pricing with pre-rates
- Excel upload for data migration
- WhatsApp & SMS templates
- Hierarchy management (Admin, salesman, sales manager)
- Task/to-do list
- Birthday/Anniversary auto-reminders
- Lead assignment and passing
- Follow-up management system
- Customer profile with complete track record
- Payment cycle management (customer & supplier)
- Bookmarks & sticky notes
- Send visa documents via email & WhatsApp
- Cloud-based centralized data management

---

## Current Tour CRM Features

### Implemented ✅
1. **Leads Management** – Create, edit, assign, convert, status workflow, follow-ups, bulk import
2. **Quotations** – Hotel, car, flight, misc lines, markup, GST, versioning, revise, PDF download
3. **Bookings** – Convert quotations, status workflow, payment tracking
4. **Payments** – Cashfree online, offline (cash/bank/UPI/card), record, verify, refund
5. **Invoices** – Auto-generate from bookings, PDF download
6. **Reviews** – Customer reviews with admin moderation and replies
7. **Users & Roles** – 4 roles (admin, manager, telecaller, accounts) with permissions
8. **Admin Master Data** – Destinations, hotel rates, car types, car rates
9. **Agency Settings** – Company info, bank details, Cashfree config, logo
10. **Dashboard** – Stats, quick actions, global search
11. **Auth** – JWT login, auth guard, interceptor

### Missing vs Competitors ❌

#### High Priority (Must Have for SaaS)
1. **Multi-tenancy / SaaS Architecture** – Company isolation, subscriptions, packages
2. **Super Admin Panel** – Manage agencies, subscriptions, payments
3. **WhatsApp Integration** – Templates, broadcasts, auto-replies, share vouchers
4. **Supplier Management** – Supplier profiles, send queries, contracted rates
5. **Itinerary Builder** – Day-wise itineraries with ready content
6. **Auto Reminders** – Birthday, anniversary, passport expiry, follow-ups
7. **Landing Page Builder** – For lead generation
8. **Email Campaigns** – Bulk email with templates, tracking
9. **Fixed Departures** – Inventory management, real-time booking
10. **Website Integration** – API for website leads, online booking
11. **Visa Management** – Visa checklist, documents, status tracking
12. **Traveller Profile** – Passport details, preferences, history
13. **Promotion/Flyers** – Quick promotional material creation
14. **Task/To-Do Management** – Team tasks, assignments
15. **B2B Network** – Share deals between agencies
16. **Auto Lead Capture** – Facebook, Google ads, website forms
17. **Customer Portal** – Already exists but needs enhancement
18. **Reporting Engine** – 50+ reports, analytics dashboard
19. **Currency Management** – Multi-currency support
20. **Hotel/Flight API Integration** – Real-time rates from suppliers

### SaaS Readiness Gaps (Not Complete)
The current Tour CRM plan is missing several SaaS-specific capabilities that should be added to the roadmap.

1. **Self-service tenant onboarding** – public agency signup, tenant registration, onboarding wizard, email verification, and initial setup are not yet implemented.
2. **Billing and subscription lifecycle** – recurring billing, automated renewals, trial→active→expired status transitions, and self-serve plan upgrade/downgrade pages are not complete.
3. **Payment gateway / webhook completeness** – subscription-specific webhooks, invoice payment reconciliation, saved payment methods, retry logic, and failure handling are not fully covered.
4. **Tenant-facing subscription management** – company admin APIs/UI for plan management, payment method management, invoice viewing, and billing dashboards are missing.
5. **Quota and feature enforcement gaps** – many tenant quotas such as bookings, invoices, visas, campaigns, storage, and message/send limits are not enforced, and there is no centralized feature-gate system.
6. **SaaS operations / observability** – alerts, thresholds, usage dashboards, health checks, and anomaly detection are not part of the current plan.
7. **Backup / disaster recovery automation** – scheduled backups, retention policy, automated verification, and restore testing workflows are absent.
8. **Security and multi-tenant hardening** – API rate limiting, tenant-specific rate quotas, and stronger SaaS perimeter controls are not included.
9. **Documentation and developer experience** – Swagger/OpenAPI, generated API docs, and SaaS onboarding documentation are not present.
10. **Tenant lifecycle management** – tenant suspend/reactivate flows, expiration cleanup, and lifecycle management tools are lacking.

#### Medium Priority (Nice to Have)
1. **Mobile App** – For sales team on the go
2. **AI Recommendations** – Smart suggestions for hotels, itineraries
3. **Chat Bot** – For website and WhatsApp
4. **Expense Management** – Track operational expenses
5. **Commission Tracking** – For sales team incentives

---

## SaaS Architecture Plan

### Database Changes

#### 1. Companies Table (Tenants)
```sql
CREATE TABLE companies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    email VARCHAR(200),
    phone VARCHAR(20),
    address TEXT,
    gstin VARCHAR(20),
    logo_url VARCHAR(500),
    website VARCHAR(200),
    status ENUM('active','suspended','inactive','pending') DEFAULT 'pending',
    subscription_package_id INT UNSIGNED,
    subscription_start_date DATE,
    subscription_end_date DATE,
    max_users INT DEFAULT 5,
    max_leads INT DEFAULT 1000,
    max_quotations INT DEFAULT 500,
    features JSON, -- enabled features for this company
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. Subscription Packages Table
```sql
CREATE TABLE subscription_packages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE,
    description TEXT,
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2) NOT NULL,
    max_users INT DEFAULT 5,
    max_leads INT DEFAULT 1000,
    max_quotations INT DEFAULT 500,
    features JSON, -- array of feature slugs
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Company Subscriptions History
```sql
CREATE TABLE company_subscriptions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id INT UNSIGNED NOT NULL,
    package_id INT UNSIGNED NOT NULL,
    billing_cycle ENUM('monthly','yearly') DEFAULT 'monthly',
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('active','expired','cancelled','pending') DEFAULT 'pending',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Super Admin Users
```sql
CREATE TABLE super_admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. Add company_id to ALL existing tables
- staff_users
- destinations
- hotel_rates
- car_types
- car_rates
- agency_settings
- leads
- quotations
- quotation_hotels
- quotation_cars
- quotation_flights
- quotation_misc
- quotation_versions
- bookings
- payments
- invoices
- reviews
- audit_log

#### 6. Company Payments (for super admin)
```sql
CREATE TABLE company_payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id INT UNSIGNED NOT NULL,
    subscription_id INT UNSIGNED,
    amount DECIMAL(10,2) NOT NULL,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    gateway ENUM('cashfree','razorpay','bank_transfer','upi','cash') DEFAULT 'bank_transfer',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    status ENUM('pending','paid','failed','refunded') DEFAULT 'pending',
    paid_at DATETIME,
    invoice_url VARCHAR(500),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. Company Invoices (for super admin)
```sql
CREATE TABLE company_invoices (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id INT UNSIGNED NOT NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    subscription_id INT UNSIGNED,
    amount DECIMAL(10,2) NOT NULL,
    gst_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
    due_date DATE,
    paid_at DATETIME,
    pdf_path VARCHAR(500),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Changes

#### Middleware
1. **companyExtractor** – Extract company_id from JWT token and attach to req
2. **companyStatusCheck** – Check if company is active/suspended
3. **subscriptionCheck** – Verify subscription is not expired
4. **superAdminAuth** – Separate auth for super admin routes

#### CRUD Modifications
- All existing controllers need to add `company_id = ?` to WHERE clauses
- All INSERTs need to include `company_id`
- Super admin routes bypass company_id filtering

#### New Super Admin Routes
- `POST /api/super-admin/login`
- `GET /api/super-admin/companies`
- `POST /api/super-admin/companies`
- `PATCH /api/super-admin/companies/:id`
- `POST /api/super-admin/companies/:id/toggle-status`
- `GET /api/super-admin/packages`
- `POST /api/super-admin/packages`
- `PATCH /api/super-admin/packages/:id`
- `GET /api/super-admin/payments`
- `POST /api/super-admin/payments`
- `GET /api/super-admin/invoices`
- `POST /api/super-admin/invoices/generate`
- `GET /api/super-admin/dashboard-stats`
- `GET /api/super-admin/reports/revenue`

### Frontend Changes

#### New Super Admin Angular App
- Separate app or route guard for super admin
- Company management list/grid
- Company detail/edit page
- Package management
- Payment collection interface
- Invoice generation and download
- Revenue dashboard with charts
- Reports page

#### CRM App Changes
- Company context in header/settings
- Subscription info display
- Feature gating based on package
- Usage limits display (users, leads, quotations)

---

## Implementation Phases

### Phase 1: Database Schema (Immediate)
1. Create companies, packages, subscriptions, super_admins tables
2. Add company_id to all existing tables
3. Create seed data for default packages
4. Migrate existing data (set company_id = 1 for existing)

### Phase 2: Backend API (Week 1)
1. Super admin auth and middleware
2. Company CRUD APIs
3. Package CRUD APIs
4. Modify all existing APIs to filter by company_id
5. Company payment/invoice APIs

### Phase 3: Frontend Super Admin (Week 2)
1. Super admin login page
2. Dashboard with stats
3. Company management
4. Package management
5. Payment/Invoice management

### Phase 4: CRM Integration (Week 3)
1. Company context in CRM
2. Subscription info display
3. Feature gating
4. Usage tracking

### Phase 5: Missing Features (Ongoing)
1. WhatsApp integration
2. Supplier management
3. Itinerary builder with ready content
4. Auto reminders
5. Landing page builder
6. Email campaigns
7. Fixed departures
8. Website integration
9. Visa management
10. Traveller profiles
11. Task management
12. B2B network
13. Auto lead capture
14. Reporting engine
15. Currency management
