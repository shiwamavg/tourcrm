// src/config/env.js — central env access with safe defaults
require('dotenv').config();

module.exports = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwt: {
        secret: process.env.JWT_SECRET || 'dev_secret_change_me',
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
    customerPortalUrl: process.env.CUSTOMER_PORTAL_URL || 'http://localhost:8080',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000'
};
