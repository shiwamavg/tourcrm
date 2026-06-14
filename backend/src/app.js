// src/app.js — Express app composition
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { extractCompany, checkCompanyStatus } = require('./middleware/company');
const paymentsCtl = require('./controllers/payments.controller');

const app = express();

app.use(helmet());
app.use(cors({
    origin: [env.frontendUrl, env.customerPortalUrl],
    credentials: true
}));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// The Cashfree webhook must receive the raw body for HMAC verification,
// so we mount it BEFORE express.json(). It also needs no auth, no CORS.
app.post('/api/payments/cashfree/webhook',
    express.raw({ type: '*/*', limit: '1mb' }),
    (req, _res, next) => {
        // Stash the raw buffer on req.rawBody for the controller's
        // signature verification, then hand control back to the controller.
        try { req.rawBody = req.body; } catch {}
        if (Buffer.isBuffer(req.body)) {
            try { req.body = JSON.parse(req.body.toString('utf8') || '{}'); } catch {}
        }
        next();
    },
    paymentsCtl.handleWebhook
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Super Admin routes (no company middleware)
app.use('/api/super-admin', require('./routes/super-admin.routes'));
// Monitoring / metrics for super-admins
app.use('/api/monitor', require('./routes/monitor.routes'));

// Company context extraction and status check for all CRM routes
app.use(extractCompany);
app.use(checkCompanyStatus);

// Public SaaS routes
app.use('/api/subscription-packages', require('./routes/subscription.routes'));

// CRM Routes
app.use('/api/auth',       require('./routes/auth.routes'));
app.use('/api/quotations', require('./routes/quotations.routes'));
app.use('/api/admin',      require('./routes/admin.routes'));
app.use('/api/admin/bookings', require('./routes/bookings.routes'));
app.use('/api/payments',   require('./routes/payments.routes'));
app.use('/api/invoices',   require('./routes/invoices.routes'));
app.use('/api/reviews',    require('./routes/reviews.routes'));
app.use('/api/portal',     require('./routes/portal.routes'));
app.use('/api/leads',      require('./routes/leads.routes'));
app.use('/api/users',      require('./routes/users.routes'));
app.use('/api/suppliers',  require('./routes/supplier.routes'));
app.use('/api/tasks',      require('./routes/task.routes'));
app.use('/api/itineraries', require('./routes/itinerary.routes'));
app.use('/api/travellers', require('./routes/traveller.routes'));
app.use('/api/reminders',  require('./routes/reminder.routes'));
app.use('/api/whatsapp',   require('./routes/whatsapp.routes'));
app.use('/api/email-campaigns', require('./routes/email-campaign.routes'));
app.use('/api/fixed-departures', require('./routes/fixed-departure.routes'));
app.use('/api/visas',      require('./routes/visa.routes'));
app.use('/api/currencies', require('./routes/currency.routes'));
app.use('/api/landing-pages', require('./routes/landing-page.routes'));
app.use('/api/usage',        require('./routes/usage.routes'));
app.use('/api/daywise-itinerary', require('./routes/daywise-itinerary.routes'));
app.use('/api/followups',         require('./routes/followup.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
