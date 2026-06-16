// src/routes/packages.routes.js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, requireRole } = require('../middleware/auth');
const c = require('../controllers/packages.controller');

// Multer Disk Storage Configuration for Static Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ── Public Routes (No Auth) ──────────────────────────────────
router.get('/', c.listPublic);
router.get('/:id', c.getPublicDetail);
router.post('/:id/book', c.bookPackagePublic);

// ── CRM Staff Routes (Requires Auth) ─────────────────────────
router.get('/admin/all', authenticate, c.listAdmin);
router.post('/upload', authenticate, requireRole('admin', 'manager'), upload.single('image'), c.uploadImage);
router.post('/', authenticate, requireRole('admin', 'manager'), c.createPackage);
router.patch('/:id', authenticate, requireRole('admin', 'manager'), c.updatePackage);
router.delete('/:id', authenticate, requireRole('admin', 'manager'), c.deletePackage);

module.exports = router;
