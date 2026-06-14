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

module.exports = { list, create, update, getById, remove };
