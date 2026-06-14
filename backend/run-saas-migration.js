// run-saas-migration.js - applies SaaS schema changes safely
const db = require('./src/config/db');

const tablesToAddCompanyId = [
    'staff_users','destinations','hotel_rates','car_types','car_rates',
    'agency_settings','leads','quotations','quotation_hotels',
    'quotation_cars','quotation_flights','quotation_misc',
    'quotation_versions','bookings','payments','invoices','reviews','audit_log'
];

async function columnExists(table, column) {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS n FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
    );
    return rows[0].n > 0;
}

async function tableExists(table) {
    const [rows] = await db.query(
        `SELECT COUNT(*) AS n FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ?`,
        [table]
    );
    return rows[0].n > 0;
}

async function run() {
    console.log('=== SaaS Migration ===');

    // 1. Create companies table
    if (!await tableExists('companies')) {
        await db.query(`
            CREATE TABLE companies (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                slug VARCHAR(100) UNIQUE,
                email VARCHAR(200),
                phone VARCHAR(20),
                address TEXT,
                gstin VARCHAR(20),
                logo_url VARCHAR(500),
                website VARCHAR(200),
                status ENUM('active','suspended','inactive','pending') NOT NULL DEFAULT 'pending',
                subscription_status ENUM('active','expired','trial','cancelled') NOT NULL DEFAULT 'trial',
                trial_ends_at DATETIME,
                subscription_package_id INT UNSIGNED,
                subscription_start_date DATE,
                email_verified_at DATETIME,
                max_users INT UNSIGNED NOT NULL DEFAULT 5,
                max_leads INT UNSIGNED NOT NULL DEFAULT 1000,
                max_quotations INT UNSIGNED NOT NULL DEFAULT 500,
                max_bookings INT UNSIGNED NOT NULL DEFAULT 200,
                max_invoices INT UNSIGNED NOT NULL DEFAULT 200,
                max_visas INT UNSIGNED NOT NULL DEFAULT 50,
                max_campaigns INT UNSIGNED NOT NULL DEFAULT 10,
                features JSON,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_companies_status (status),
                INDEX idx_companies_sub_status (subscription_status)
            ) ENGINE=InnoDB
        `);
        console.log('Created: companies');
    }

    if (await tableExists('companies')) {
        if (!await columnExists('companies', 'subscription_package_id')) {
            await db.query('ALTER TABLE companies ADD COLUMN subscription_package_id INT UNSIGNED NULL AFTER trial_ends_at');
            console.log('Added companies.subscription_package_id');
        }
        if (!await columnExists('companies', 'subscription_start_date')) {
            await db.query('ALTER TABLE companies ADD COLUMN subscription_start_date DATE NULL AFTER subscription_package_id');
            console.log('Added companies.subscription_start_date');
        }
        if (!await columnExists('companies', 'email_verified_at')) {
            await db.query('ALTER TABLE companies ADD COLUMN email_verified_at DATETIME NULL AFTER subscription_start_date');
            console.log('Added companies.email_verified_at');
        }
        if (!await columnExists('companies', 'max_invoices')) {
            await db.query('ALTER TABLE companies ADD COLUMN max_invoices INT UNSIGNED NOT NULL DEFAULT 200 AFTER max_bookings');
            console.log('Added companies.max_invoices');
        }
        if (!await columnExists('companies', 'max_visas')) {
            await db.query('ALTER TABLE companies ADD COLUMN max_visas INT UNSIGNED NOT NULL DEFAULT 50 AFTER max_invoices');
            console.log('Added companies.max_visas');
        }
        if (!await columnExists('companies', 'max_campaigns')) {
            await db.query('ALTER TABLE companies ADD COLUMN max_campaigns INT UNSIGNED NOT NULL DEFAULT 10 AFTER max_visas');
            console.log('Added companies.max_campaigns');
        }
    }

    // 2. Create subscription_packages
    if (!await tableExists('subscription_packages')) {
        await db.query(`
            CREATE TABLE subscription_packages (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
                max_users INT UNSIGNED NOT NULL DEFAULT 5,
                max_leads INT UNSIGNED NOT NULL DEFAULT 1000,
                max_quotations INT UNSIGNED NOT NULL DEFAULT 500,
                max_bookings INT UNSIGNED NOT NULL DEFAULT 200,
                max_invoices INT UNSIGNED NOT NULL DEFAULT 200,
                max_visas INT UNSIGNED NOT NULL DEFAULT 50,
                max_campaigns INT UNSIGNED NOT NULL DEFAULT 10,
                features JSON,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                sort_order INT NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);
        console.log('Created: subscription_packages');
    }

    if (await tableExists('subscription_packages')) {
        if (!await columnExists('subscription_packages', 'max_invoices')) {
            await db.query('ALTER TABLE subscription_packages ADD COLUMN max_invoices INT UNSIGNED NOT NULL DEFAULT 200 AFTER max_bookings');
            console.log('Added subscription_packages.max_invoices');
        }
        if (!await columnExists('subscription_packages', 'max_visas')) {
            await db.query('ALTER TABLE subscription_packages ADD COLUMN max_visas INT UNSIGNED NOT NULL DEFAULT 50 AFTER max_invoices');
            console.log('Added subscription_packages.max_visas');
        }
        if (!await columnExists('subscription_packages', 'max_campaigns')) {
            await db.query('ALTER TABLE subscription_packages ADD COLUMN max_campaigns INT UNSIGNED NOT NULL DEFAULT 10 AFTER max_visas');
            console.log('Added subscription_packages.max_campaigns');
        }
    }

    // 3. Create company_subscriptions
    if (!await tableExists('company_subscriptions')) {
        await db.query(`
            CREATE TABLE company_subscriptions (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                company_id INT UNSIGNED NOT NULL,
                package_id INT UNSIGNED NOT NULL,
                billing_cycle ENUM('monthly','yearly','trial') NOT NULL DEFAULT 'trial',
                amount DECIMAL(10,2) NOT NULL,
                gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('active','expired','cancelled','pending') NOT NULL DEFAULT 'pending',
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
                FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB
        `);
        console.log('Created: company_subscriptions');
    }

    // 4. Create super_admins
    if (!await tableExists('super_admins')) {
        await db.query(`
            CREATE TABLE super_admins (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(150) NOT NULL,
                email VARCHAR(200) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                is_active TINYINT(1) NOT NULL DEFAULT 1,
                last_login_at DATETIME,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `);
        console.log('Created: super_admins');
    }

    // 5. Create company_payments
    if (!await tableExists('company_payments')) {
        await db.query(`
            CREATE TABLE company_payments (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                company_id INT UNSIGNED NOT NULL,
                subscription_id INT UNSIGNED,
                amount DECIMAL(10,2) NOT NULL,
                gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                gateway ENUM('cashfree','razorpay','bank_transfer','upi','cash') NOT NULL DEFAULT 'bank_transfer',
                gateway_order_id VARCHAR(100),
                gateway_payment_id VARCHAR(100),
                status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
                paid_at DATETIME,
                transaction_id VARCHAR(100),
                notes TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
        console.log('Created: company_payments');
    }

    // 6. Create company_invoices
    if (!await tableExists('company_invoices')) {
        await db.query(`
            CREATE TABLE company_invoices (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                company_id INT UNSIGNED NOT NULL,
                subscription_id INT UNSIGNED,
                invoice_number VARCHAR(50) NOT NULL UNIQUE,
                billing_period_start DATE,
                billing_period_end DATE,
                amount DECIMAL(10,2) NOT NULL,
                gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('draft','sent','paid','overdue','cancelled') NOT NULL DEFAULT 'draft',
                due_date DATE,
                paid_at DATETIME,
                pdf_path VARCHAR(500),
                notes TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
        console.log('Created: company_invoices');
    }

    // 7. Add company_id to existing tables
    for (const table of tablesToAddCompanyId) {
        if (!await columnExists(table, 'company_id')) {
            try {
                await db.query(`ALTER TABLE ${table} ADD COLUMN company_id INT UNSIGNED NOT NULL DEFAULT 1`);
                console.log(`Added company_id to: ${table}`);
            } catch (e) {
                console.warn(`Warning adding company_id to ${table}: ${e.message}`);
            }
        } else {
            console.log(`company_id already exists in: ${table}`);
        }
    }

    // 8. Seed default company
    const [[comp]] = await db.query('SELECT id FROM companies WHERE id = 1');
    if (!comp) {
        await db.query(`
            INSERT INTO companies (id, name, slug, email, phone, address, status, subscription_status, max_users, max_leads, max_quotations, max_bookings, features)
            VALUES (1, 'Sikkim Trails Travel', 'sikkim-trails', 'bookings@sikkimtrails.in', '+91 98765 43210',
                    'M.G. Marg, Gangtok, Sikkim 737101', 'active', 'active', 10, 5000, 2000, 500,
                    JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard'))
        `);
        console.log('Seeded default company (id=1)');
    }

    // 9. Seed subscription packages
    const [[pkg]] = await db.query('SELECT id FROM subscription_packages LIMIT 1');
    if (!pkg) {
        await db.query(`
            INSERT INTO subscription_packages (name, slug, description, price_monthly, price_yearly, max_users, max_leads, max_quotations, max_bookings, max_invoices, max_visas, max_campaigns, features, sort_order)
            VALUES
            ('Starter', 'starter', 'Perfect for small travel agencies just getting started.', 2999, 29990, 3, 500, 200, 50, 50, 10, 2, JSON_ARRAY('leads','quotations','bookings','dashboard','destinations','rates'), 1),
            ('Professional', 'professional', 'For growing agencies with team and regular bookings.', 5999, 59990, 10, 3000, 1000, 300, 300, 100, 10, JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard'), 2),
            ('Enterprise', 'enterprise', 'Full-featured solution for large agencies and DMCs.', 11999, 119990, 50, 20000, 5000, 2000, 2000, 500, 50, JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard','whatsapp','supplier','b2b','website'), 3)
        `);
        console.log('Seeded subscription packages');
    }

    // Always sync package and company limits to include the new resources
    await db.query("UPDATE subscription_packages SET max_invoices=50, max_visas=10, max_campaigns=2, features = JSON_ARRAY('leads','quotations','bookings','dashboard','destinations','rates') WHERE slug='starter'");
    await db.query("UPDATE subscription_packages SET max_invoices=300, max_visas=100, max_campaigns=10, features = JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard') WHERE slug='professional'");
    await db.query("UPDATE subscription_packages SET max_invoices=2000, max_visas=500, max_campaigns=50, features = JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard','whatsapp','supplier','b2b','website','campaigns') WHERE slug='enterprise'");
    await db.query("UPDATE companies SET max_invoices=300, max_visas=100, max_campaigns=10, features = JSON_ARRAY('leads','quotations','bookings','payments','invoices','reviews','users','settings','destinations','rates','reports','dashboard') WHERE id=1");
    console.log('Synchronized max_invoices, max_visas, max_campaigns and features values for existing records.');

    // 10. Seed super admin
    const [[sa]] = await db.query('SELECT id FROM super_admins LIMIT 1');
    if (!sa) {
        await db.query(`
            INSERT INTO super_admins (full_name, email, password_hash, is_active)
            VALUES ('Super Admin', 'superadmin@tourcrm.local',
                    '$2b$10$demohashnotreal...........................................', 1)
        `);
        console.log('Seeded super admin');
    }

    // 11. Update existing data to company_id = 1
    for (const table of tablesToAddCompanyId) {
        await db.query(`UPDATE ${table} SET company_id = 1 WHERE company_id = 0 OR company_id IS NULL`);
    }
    console.log('Updated existing data to company_id = 1');

    // 12. Add competitor feature updates (B2B and Flyers)
    if (await tableExists('fixed_departures')) {
        if (!await columnExists('fixed_departures', 'is_b2b_shared')) {
            await db.query('ALTER TABLE fixed_departures ADD COLUMN is_b2b_shared TINYINT(1) DEFAULT 0');
            console.log('Added fixed_departures.is_b2b_shared');
        }
    }
    if (await tableExists('itineraries')) {
        if (!await columnExists('itineraries', 'is_b2b_shared')) {
            await db.query('ALTER TABLE itineraries ADD COLUMN is_b2b_shared TINYINT(1) DEFAULT 0');
            console.log('Added itineraries.is_b2b_shared');
        }
    }
    if (!await tableExists('flyers')) {
        await db.query(`
            CREATE TABLE flyers (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
                company_id INT UNSIGNED NOT NULL,
                title VARCHAR(255) NOT NULL,
                layout_data JSON,
                package_id INT UNSIGNED,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
        console.log('Created: flyers');
    }

    console.log('=== Migration Complete ===');
    process.exit(0);
}

run().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
});
