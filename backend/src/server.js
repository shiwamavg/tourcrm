// src/server.js — entry point
const app = require('./app');
const env = require('./config/env');
const { processAll } = require('./scripts/campaign-scheduler');
const { processBillingLifecycle } = require('./scripts/billing-scheduler');

app.listen(env.port, () => {
    console.log(`✓ Tour CRM API running on http://localhost:${env.port}`);
    console.log(`  Environment: ${env.nodeEnv}`);

    if (env.nodeEnv !== 'test') {
        const campaignIntervalMs = 60 * 1000; // run every 1 minute
        const billingIntervalMs = 60 * 60 * 1000; // run every 1 hour

        setInterval(() => {
            processAll().catch(err => console.error('Campaign scheduler background run failed:', err));
        }, campaignIntervalMs);

        setInterval(() => {
            processBillingLifecycle().catch(err => console.error('Billing scheduler background run failed:', err));
        }, billingIntervalMs);

        console.log(`✓ Schedulers active: Campaigns (every 1m), Billing Lifecycle (every 1h)`);

        // Run immediately on startup
        processAll().catch(err => console.error('Initial campaign run failed:', err));
        processBillingLifecycle().catch(err => console.error('Initial billing run failed:', err));
    }
});
