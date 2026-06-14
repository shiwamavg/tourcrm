// src/scripts/billing-scheduler.js - SaaS billing & subscription lifecycle background processor
const db = require('../config/db');

async function processBillingLifecycle() {
    console.log(`[${new Date().toISOString()}] Starting SaaS billing & subscription lifecycle checks...`);

    try {
        // 1. Process Expired Trials
        const [expiredTrials] = await db.query(
            `SELECT id, name, contact_email FROM companies 
              WHERE status = 'active' 
                AND subscription_status = 'trial' 
                AND trial_ends_at < NOW()`
        );
        
        for (const company of expiredTrials) {
            console.log(`[Trial Expired] Company: ${company.name} (ID: ${company.id})`);
            await db.query(
                `UPDATE companies 
                    SET subscription_status = 'expired' 
                  WHERE id = ?`,
                [company.id]
            );
            // In a production app, trigger an email alert here.
        }

        // 2. Process Expired Subscriptions
        const [expiredSubs] = await db.query(
            `SELECT id, name, contact_email FROM companies 
              WHERE status = 'active' 
                AND subscription_status = 'active' 
                AND subscription_end_date < CURDATE()`
        );

        for (const company of expiredSubs) {
            console.log(`[Subscription Expired] Company: ${company.name} (ID: ${company.id})`);
            await db.query(
                `UPDATE companies 
                    SET subscription_status = 'expired' 
                  WHERE id = ?`,
                [company.id]
            );
        }

        // 3. Generate Upcoming Renewal Invoices (3 days before subscription_end_date)
        const [upcomingRenewals] = await db.query(
            `SELECT c.id, c.name, c.subscription_package_id, c.subscription_end_date, 
                    sp.price_monthly, sp.price_yearly, sp.name AS package_name
               FROM companies c
               JOIN subscription_packages sp ON sp.id = c.subscription_package_id
              WHERE c.status = 'active' 
                AND c.subscription_status = 'active' 
                AND c.subscription_end_date = DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
        );

        for (const company of upcomingRenewals) {
            // Check if renewal invoice already generated
            const [existing] = await db.query(
                `SELECT id FROM company_invoices 
                  WHERE company_id = ? 
                    AND billing_period_start = ?`,
                [company.id, company.subscription_end_date]
            );

            if (existing.length === 0) {
                const amount = company.price_monthly; // assume monthly billing default
                const gstAmount = amount * 0.18; // 18% GST for SaaS platform
                const total = amount + gstAmount;
                const invoiceNumber = `SAAS-REN-${company.id}-${Date.now().toString().slice(-6)}`;
                const dueDate = company.subscription_end_date;

                const [sub] = await db.query(
                    `SELECT id FROM company_subscriptions 
                      WHERE company_id = ? AND status = 'active' 
                      ORDER BY id DESC LIMIT 1`,
                    [company.id]
                );

                await db.query(
                    `INSERT INTO company_invoices
                        (company_id, subscription_id, invoice_number, amount, gst_amount, total_amount,
                         status, due_date, billing_period_start, billing_period_end, notes)
                     VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, DATE_ADD(?, INTERVAL 1 MONTH), ?)`,
                    [
                        company.id,
                        sub[0]?.id || null,
                        invoiceNumber,
                        amount,
                        gstAmount,
                        total,
                        dueDate,
                        company.subscription_end_date,
                        company.subscription_end_date,
                        `Renewal invoice for subscription package: ${company.package_name}`
                    ]
                );
                console.log(`[Invoice Generated] Created renewal invoice ${invoiceNumber} for Company: ${company.name}`);
            }
        }

        console.log(`[${new Date().toISOString()}] Subscription billing checks completed successfully.`);
    } catch (err) {
        console.error('Error executing billing scheduler:', err);
    }
}

if (require.main === module) {
    processBillingLifecycle().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
    module.exports = { processBillingLifecycle };
}
