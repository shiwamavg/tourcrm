// src/routes/leads.routes.js
//
// Admin routes (staff auth required):
//   GET    /api/leads
//   GET    /api/leads/stats
//   GET    /api/leads/:id
//   POST   /api/leads
//   PATCH  /api/leads/:id
//   POST   /api/leads/:id/assign
//   POST   /api/leads/:id/status
//   POST   /api/leads/:id/convert
//   POST   /api/leads/bulk-import            (multipart/form-data, field "file")
//
// Public / unauthenticated routes:
//   POST   /api/leads/public                 (website form)
//   POST   /api/leads/webhook/meta-ads       (Meta lead-form webhook, HMAC-verified)

const router  = require('express').Router();
const multer = require('multer');
const c = require('../controllers/leads.controller');
const { authenticate } = require('../middleware/auth');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ── Public ────────────────────────────────────────────────
router.post('/public',                c.publicCreate);
router.get ('/sample-csv',            c.downloadSampleCsv);   // no auth – anyone can grab sample
router.post('/webhook/meta-ads',
    require('express').raw({ type: '*/*', limit: '1mb' }),
    (req, _res, next) => {
        // Stash the raw body for HMAC verification (mirrors the Cashfree webhook pattern).
        try { req.rawBody = req.body; } catch {}
        if (Buffer.isBuffer(req.body)) {
            try { req.body = JSON.parse(req.body.toString('utf8') || '{}'); } catch {}
        }
        next();
    },
    c.metaAdsWebhook
);

// ── Staff ─────────────────────────────────────────────────
router.use(authenticate);
router.get ('/stats',                       c.leadsStats);
router.get ('/follow-ups/today',            c.todayFollowups);
router.get ('/follow-ups/overdue',          c.overdueFollowups);
router.get ('/follow-ups/all',              c.allFollowups);
router.get ('/',                            c.listLeads);
router.get ('/:id',                         c.getLead);
router.post('/',                            c.createLead);
router.patch('/:id',                        c.updateLead);
router.post('/:id/assign',                  c.assignLead);
router.post('/:id/status',                  c.setStatus);
router.post('/:id/convert',                 c.convertLead);
router.post('/bulk-preview',                upload.single('file'), c.previewBulkImport);
router.post('/bulk-import',                 upload.single('file'), c.bulkImport);

module.exports = router;
