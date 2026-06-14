// src/middleware/error.js — central error handler
const env = require('../config/env');

const notFound = (req, res, next) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
    console.error('[ERR]', err);
    const status = err.status || 500;
    res.status(status).json({
        error: err.message || 'Internal server error',
        ...(env.nodeEnv === 'development' && { stack: err.stack })
    });
};

module.exports = { notFound, errorHandler };
