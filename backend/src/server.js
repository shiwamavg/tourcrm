// src/server.js — entry point
const app = require('./app');
const env = require('./config/env');
const { processAll } = require('./scripts/campaign-scheduler');
const { processBillingLifecycle } = require('./scripts/billing-scheduler');
const messageScheduler = require('./scripts/message-scheduler');
const autoReminderScheduler = require('./scripts/auto-reminder-scheduler');
const backupCron = require('./scripts/backup-cron');

app.listen(env.port, () => {
    console.log(`✓ Tour CRM API running on http://localhost:${env.port}`);
    console.log(`  Environment: ${env.nodeEnv}`);

    if (env.nodeEnv !== 'test') {
        const min1 = 60 * 1000;
        const hour1 = 60 * 60 * 1000;
        const hour24 = 24 * 60 * 60 * 1000;

        // 1-minute intervals
        setInterval(() => {
            processAll().catch(err => console.error('Campaign scheduler failed:', err));
            messageScheduler.run().catch(err => console.error('Message scheduler failed:', err));
        }, min1);

        // 1-hour intervals
        setInterval(() => {
            processBillingLifecycle().catch(err => console.error('Billing scheduler failed:', err));
        }, hour1);

        // 24-hour intervals (Daily)
        setInterval(() => {
            autoReminderScheduler.processAutoReminders().catch(err => console.error('Auto-reminder scheduler failed:', err));
            backupCron.runBackup().catch(err => console.error('Backup cron failed:', err));
        }, hour24);

        console.log(`✓ Schedulers active: Campaigns & Messages (1m), Billing (1h), Auto-Reminders & Backups (24h)`);

        // Run immediately on startup
        processAll().catch(err => console.error('Initial campaign run failed:', err));
        messageScheduler.run().catch(err => console.error('Initial message run failed:', err));
        processBillingLifecycle().catch(err => console.error('Initial billing run failed:', err));
        autoReminderScheduler.processAutoReminders().catch(err => console.error('Initial auto-reminder run failed:', err));
    }
});
