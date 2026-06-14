require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Security middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:4200',
        process.env.CUSTOMER_PORTAL_URL || 'http://localhost:8080'
    ],
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiter
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
}));

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth.routes'));
app.use('/api/leads',          require('./routes/leads.routes'));
app.use('/api/quotations',     require('./routes/quotations.routes'));
app.use('/api/bookings',       require('./routes/bookings.routes'));
app.use('/api/payments',       require('./routes/payments.routes'));
app.use('/api/invoices',       require('./routes/invoices.routes'));
app.use('/api/admin',          require('./routes/admin.routes'));
app.use('/api/portal',         require('./routes/portal.routes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ── Start cron jobs ──────────────────────────────────────────────
if (process.env.GOOGLE_SHEETS_CREDENTIALS_PATH) {
    require('./jobs/google-sheets-sync.job');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));

module.exports = app;
