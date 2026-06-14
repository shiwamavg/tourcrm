// src/routes/super-admin.routes.js
const router = require('express').Router();
const { authenticateSuperAdmin } = require('../middleware/super-admin-auth');
const c = require('../controllers/super-admin.controller');

// Auth (no auth required)
router.post('/login', c.login);

// All routes below require super admin auth
router.use(authenticateSuperAdmin);

// Dashboard
router.get('/dashboard-stats', c.dashboardStats);

// Companies
router.get('/companies', c.listCompanies);
router.get('/companies/:id', c.getCompany);
router.post('/companies', c.createCompany);
router.patch('/companies/:id', c.updateCompany);
router.post('/companies/:id/toggle-status', c.toggleCompanyStatus);

// Subscription Packages
router.get('/packages', c.listPackages);
router.post('/packages', c.createPackage);
router.patch('/packages/:id', c.updatePackage);

// Company Payments (collections from agencies)
router.get('/payments', c.listCompanyPayments);
router.post('/payments', c.createCompanyPayment);
router.get('/payments/:id/invoice/download', c.downloadCompanyPaymentInvoice);


// Company Invoices (billing to agencies)
router.get('/invoices', c.listCompanyInvoices);
router.post('/invoices', c.createCompanyInvoice);
router.patch('/invoices/:id', c.updateCompanyInvoice);
router.get('/invoices/:id/download', c.downloadCompanyInvoice);

// Reports
router.get('/reports/revenue', c.revenueReport);

module.exports = router;
