const db = require('../config/db');

async function list(req, res) {
    const companyId = req.companyId;
    try {
        const [rows] = await db.query('SELECT id, title, slug, is_published, created_at FROM landing_pages WHERE company_id=? ORDER BY created_at DESC', [companyId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function create(req, res) {
    const companyId = req.companyId;
    const { title, slug, meta_description, hero_title, hero_subtitle, hero_image_url, content, css_custom, lead_form_fields, seo_keywords } = req.body;
    try {
        const [result] = await db.query(
            `INSERT INTO landing_pages (company_id, title, slug, meta_description, hero_title, hero_subtitle, hero_image_url, content, css_custom, lead_form_fields, seo_keywords)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, title, slug, meta_description, hero_title, hero_subtitle, hero_image_url, JSON.stringify(content || []), css_custom, JSON.stringify(lead_form_fields || []), seo_keywords]
        );
        res.status(201).json({ id: result.insertId, message: 'Landing page created' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function update(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    const { title, slug, meta_description, hero_title, hero_subtitle, hero_image_url, content, css_custom, is_published, lead_form_fields, seo_keywords } = req.body;
    try {
        await db.query(
            `UPDATE landing_pages SET title=?, slug=?, meta_description=?, hero_title=?, hero_subtitle=?, hero_image_url=?, content=?, css_custom=?, is_published=?, lead_form_fields=?, seo_keywords=? WHERE id=? AND company_id=?`,
            [title, slug, meta_description, hero_title, hero_subtitle, hero_image_url, JSON.stringify(content || []), css_custom, is_published ? 1 : 0, JSON.stringify(lead_form_fields || []), seo_keywords, id, companyId]
        );
        res.json({ message: 'Landing page updated' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function getById(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        const [[row]] = await db.query('SELECT * FROM landing_pages WHERE id=? AND company_id=?', [id, companyId]);
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json(row);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

async function remove(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        await db.query('DELETE FROM landing_pages WHERE id=? AND company_id=?', [id, companyId]);
        res.json({ message: 'Landing page deleted' });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

/**
 * Public rendering of a published landing page.
 * GET /api/pages/:slug
 * No authentication required.
 */
async function renderPublic(req, res) {
    try {
        const slug = req.params.slug;
        const [[page]] = await db.query(
            'SELECT * FROM landing_pages WHERE slug = ? AND is_published = 1',
            [slug]
        );
        if (!page) return res.status(404).json({ error: 'Page not found' });

        let contentBlocks = [];
        try { contentBlocks = typeof page.content === 'string' ? JSON.parse(page.content) : (page.content || []); } catch {}
        let formFields = [];
        try { formFields = typeof page.lead_form_fields === 'string' ? JSON.parse(page.lead_form_fields) : (page.lead_form_fields || []); } catch {}

        // Build content sections HTML
        const sectionsHtml = contentBlocks.map(block => {
            if (block.type === 'text') return `<div class="section"><p>${block.body || ''}</p></div>`;
            if (block.type === 'image') return `<div class="section"><img src="${block.url || ''}" alt="${block.alt || ''}" style="max-width:100%"></div>`;
            if (block.type === 'cta') return `<div class="section cta"><a href="${block.url || '#'}" class="cta-btn">${block.label || 'Learn More'}</a></div>`;
            return `<div class="section"><p>${block.body || block.text || ''}</p></div>`;
        }).join('\n');

        // Build lead form HTML
        const defaultFields = formFields.length > 0 ? formFields : ['full_name', 'email', 'phone', 'message'];
        const fieldHtml = defaultFields.map(f => {
            const label = f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const type = f === 'email' ? 'email' : (f === 'phone' ? 'tel' : 'text');
            return `<div class="form-group"><label for="${f}">${label}</label><input type="${type}" name="${f}" id="${f}" required></div>`;
        }).join('\n');

        // Load agency settings for branding
        const [settings] = await db.query('SELECT agency_name FROM agency_settings WHERE company_id = ? LIMIT 1', [page.company_id]);
        const agencyName = settings[0]?.agency_name || 'Travel Agency';

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title || page.hero_title || 'Travel Package'}</title>
    <meta name="description" content="${page.meta_description || ''}">
    <meta name="keywords" content="${page.seo_keywords || ''}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; }
        .hero { background: linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.3))${page.hero_image_url ? `, url('${page.hero_image_url}')` : ''}; background-size: cover; background-position: center; padding: 80px 20px; text-align: center; color: #fff; min-height: 400px; display: flex; flex-direction: column; justify-content: center; }
        .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
        .hero p { font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }
        .section { max-width: 800px; margin: 30px auto; padding: 0 20px; line-height: 1.7; }
        .cta { text-align: center; }
        .cta-btn { display: inline-block; background: #2563eb; color: #fff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.2s; }
        .cta-btn:hover { background: #1d4ed8; }
        .lead-form { max-width: 500px; margin: 40px auto; padding: 30px; background: #f8f9fa; border-radius: 12px; }
        .lead-form h3 { margin-bottom: 20px; text-align: center; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 4px; font-weight: 500; font-size: 0.9rem; }
        .form-group input, .form-group textarea { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; }
        .submit-btn { width: 100%; padding: 12px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 1rem; cursor: pointer; font-weight: 600; }
        .submit-btn:hover { background: #1d4ed8; }
        .footer { text-align: center; padding: 30px; color: #999; font-size: 0.85rem; }
        .success-msg { display: none; text-align: center; padding: 20px; color: #059669; font-weight: 600; }
        ${page.css_custom || ''}
    </style>
</head>
<body>
    <div class="hero">
        <h1>${page.hero_title || page.title || ''}</h1>
        <p>${page.hero_subtitle || ''}</p>
    </div>
    ${sectionsHtml}
    <div class="lead-form">
        <h3>Enquire Now</h3>
        <form id="leadForm">
            <input type="hidden" name="company_id" value="${page.company_id}">
            <input type="hidden" name="landing_page_id" value="${page.id}">
            ${fieldHtml}
            <button type="submit" class="submit-btn">Send Enquiry</button>
        </form>
        <div class="success-msg" id="successMsg">Thank you! We'll get back to you shortly.</div>
    </div>
    <div class="footer">Powered by ${agencyName}</div>
    <script>
        document.getElementById('leadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const fd = new FormData(this);
            const data = Object.fromEntries(fd.entries());
            try {
                const res = await fetch('/api/pages/' + '${slug}' + '/lead', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    this.style.display = 'none';
                    document.getElementById('successMsg').style.display = 'block';
                } else {
                    const err = await res.json();
                    alert(err.error || 'Something went wrong');
                }
            } catch (err) { alert('Network error'); }
        });
    </script>
</body>
</html>`;
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (e) { res.status(500).json({ error: e.message }); }
}

/**
 * Submit a lead from a public landing page.
 * POST /api/pages/:slug/lead
 * No authentication required.
 */
async function submitLeadForm(req, res) {
    try {
        const slug = req.params.slug;
        const { full_name, email, phone, message, company_id, landing_page_id } = req.body || {};

        if (!full_name && !email && !phone) {
            return res.status(400).json({ error: 'At least one of full_name, email, or phone is required' });
        }

        // Validate the landing page exists and is published
        const [[page]] = await db.query(
            'SELECT id, company_id FROM landing_pages WHERE slug = ? AND is_published = 1',
            [slug]
        );
        if (!page) return res.status(404).json({ error: 'Page not found' });

        const cid = page.company_id;

        // Check quota
        try {
            const { getCompanyQuota } = require('../middleware/quota');
            const quota = await getCompanyQuota(cid);
            if (quota && quota.currentCounts.leads >= quota.maxLeads) {
                console.warn(`[Landing Page Lead] Quota exceeded for company ${cid}`);
                // Still accept the lead but log the warning
            }
        } catch {}

        const [r] = await db.query(
            `INSERT INTO leads (company_id, full_name, email, phone, source, notes, destination_text)
             VALUES (?, ?, ?, ?, 'landing_page', ?, ?)`,
            [cid, full_name || null, email || null, phone || null,
             message || `Submitted from landing page: ${slug}`, null]
        );

        res.status(201).json({ ok: true, lead_id: r.insertId });
    } catch (e) { res.status(500).json({ error: e.message }); }
}

module.exports = { list, create, update, getById, remove, renderPublic, submitLeadForm };

