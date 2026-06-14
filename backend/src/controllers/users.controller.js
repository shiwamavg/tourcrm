// src/controllers/users.controller.js
// User & role management for the CRM.

const bcrypt = require('bcrypt');
const db = require('../config/db');

const SALT_ROUNDS = 10;
const VALID_ROLES = new Set(['admin','manager','telecaller','accounts']);

// ── helpers ──────────────────────────────────────────────────
function normalizeUser(row) {
    if (!row) return null;
    const u = { ...row };
    delete u.password_hash;
    if (u.permissions && typeof u.permissions === 'string') {
        try { u.permissions = JSON.parse(u.permissions); } catch { u.permissions = {}; }
    }
    return u;
}

// ── list users ───────────────────────────────────────────────
const listUsers = async (req, res, next) => {
    try {
        const { q, role, is_active, page = 1, limit = 50 } = req.query;
        const where = ['su.company_id = ?'];
        const params = [req.companyId];
        if (q) {
            where.push('(su.full_name LIKE ? OR su.email LIKE ? OR su.phone LIKE ?)');
            const like = `%${q}%`;
            params.push(like, like, like);
        }
        if (role) { where.push('su.role = ?'); params.push(role); }
        if (is_active !== undefined) { where.push('su.is_active = ?'); params.push(is_active); }
        const whereSql = 'WHERE ' + where.join(' AND ');
        const offset = (Math.max(1, +page) - 1) * +limit;

        const [rows] = await db.query(
            `SELECT su.id, su.full_name, su.email, su.phone, su.role, su.role_id,
                    su.is_active, su.last_login_at, su.created_at,
                    r.name AS role_name, r.slug AS role_slug
               FROM staff_users su
          LEFT JOIN roles r ON r.id = su.role_id
               ${whereSql}
           ORDER BY su.id DESC
              LIMIT ? OFFSET ?`,
            [...params, +limit, offset]
        );
        const [count] = await db.query(
            `SELECT COUNT(*) AS total FROM staff_users su ${whereSql}`, params
        );
        res.json({ items: rows.map(normalizeUser), total: count[0].total, page: +page, limit: +limit });
    } catch (err) { next(err); }
};

// ── get one ──────────────────────────────────────────────────
const getUser = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT su.*, r.name AS role_name, r.slug AS role_slug, r.permissions
               FROM staff_users su
          LEFT JOIN roles r ON r.id = su.role_id
              WHERE su.id = ? AND su.company_id = ?`,
            [req.params.id, req.companyId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(normalizeUser(rows[0]));
    } catch (err) { next(err); }
};

// ── create ───────────────────────────────────────────────────
const createUser = async (req, res, next) => {
    try {
        const { full_name, email, phone, password, role = 'telecaller', role_id, is_active = 1 } = req.body || {};
        if (!full_name?.trim()) return res.status(400).json({ error: 'full_name is required' });
        if (!email?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            return res.status(400).json({ error: 'valid email is required' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'password must be at least 6 characters' });
        }

        // Check company user limit
        const [[usage]] = await db.query(
            'SELECT COUNT(*) AS count FROM staff_users WHERE company_id = ? AND is_active = 1',
            [req.companyId]
        );
        const [[company]] = await db.query('SELECT max_users FROM companies WHERE id = ?', [req.companyId]);
        if (company && usage.count >= company.max_users) {
            return res.status(403).json({ error: 'User limit reached for your plan. Upgrade to add more users.' });
        }

        // Resolve role_id from role slug if not provided
        let finalRoleId = role_id || null;
        if (!finalRoleId && role) {
            const [r] = await db.query('SELECT id FROM roles WHERE slug = ?', [role]);
            if (r[0]) finalRoleId = r[0].id;
        }

        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
        const [ins] = await db.query(
            `INSERT INTO staff_users (full_name, email, phone, password_hash, role, role_id, is_active, company_id)
             VALUES (?,?,?,?,?,?,?,?)`,
            [full_name.trim(), email.trim(), phone || null, password_hash, role, finalRoleId, is_active ? 1 : 0, req.companyId]
        );

        // Log audit
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_data, company_id)
             VALUES (?, 'user_created', 'staff_user', ?, ?, ?)`,
            [req.user?.id || null, ins.insertId, JSON.stringify({ full_name, email, role, is_active }), req.companyId]
        );

        const [created] = await db.query(
            `SELECT su.*, r.name AS role_name, r.slug AS role_slug
               FROM staff_users su
          LEFT JOIN roles r ON r.id = su.role_id
              WHERE su.id = ? AND su.company_id = ?`, [ins.insertId, req.companyId]
        );
        res.status(201).json(normalizeUser(created[0]));
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
        next(err);
    }
};

// ── update ───────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { full_name, email, phone, role, role_id, is_active } = req.body || {};
        const allowed = ['full_name','email','phone','role','role_id','is_active'];
        const sets = []; const params = [];

        for (const k of allowed) {
            if (req.body[k] !== undefined) {
                if (k === 'email' && (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
                    return res.status(400).json({ error: 'invalid email' });
                }
                sets.push(`${k} = ?`);
                params.push(req.body[k]);
            }
        }

        if (!sets.length) return res.status(400).json({ error: 'no fields to update' });

        // Resolve role_id from role if provided
        if (role && !role_id) {
            const [r] = await db.query('SELECT id FROM roles WHERE slug = ?', [role]);
            if (r[0]) {
                sets.push('role_id = ?');
                params.push(r[0].id);
            }
        }

        params.push(id, req.companyId);
        const [old] = await db.query('SELECT * FROM staff_users WHERE id = ? AND company_id = ?', [id, req.companyId]);
        const [r] = await db.query(`UPDATE staff_users SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`, params);
        if (!r.affectedRows) return res.status(404).json({ error: 'User not found' });

        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, old_data, new_data, company_id)
             VALUES (?, 'user_updated', 'staff_user', ?, ?, ?, ?)`,
            [req.user?.id || null, id, JSON.stringify(old[0]), JSON.stringify(req.body), req.companyId]
        );

        const [updated] = await db.query(
            `SELECT su.*, r.name AS role_name, r.slug AS role_slug
               FROM staff_users su
          LEFT JOIN roles r ON r.id = su.role_id
              WHERE su.id = ? AND su.company_id = ?`, [id, req.companyId]
        );
        res.json(normalizeUser(updated[0]));
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
        next(err);
    }
};

// ── toggle active status ─────────────────────────────────────
const toggleActive = async (req, res, next) => {
    try {
        const id = req.params.id;
        if (+id === req.user?.id) {
            return res.status(400).json({ error: 'You cannot deactivate yourself.' });
        }
        const [old] = await db.query('SELECT is_active FROM staff_users WHERE id = ? AND company_id = ?', [id, req.companyId]);
        if (!old[0]) return res.status(404).json({ error: 'User not found' });
        const newStatus = old[0].is_active ? 0 : 1;
        await db.query('UPDATE staff_users SET is_active = ? WHERE id = ? AND company_id = ?', [newStatus, id, req.companyId]);
        await db.query(
            `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_data, company_id)
             VALUES (?, ?, 'staff_user', ?, ?, ?)`,
            [req.user?.id || null, newStatus ? 'user_activated' : 'user_deactivated', id,
             JSON.stringify({ is_active: newStatus }), req.companyId]
        );
        res.json({ ok: true, id, is_active: newStatus });
    } catch (err) { next(err); }
};

// ── reset password ───────────────────────────────────────────
const resetPassword = async (req, res, next) => {
    try {
        const { password } = req.body || {};
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'password must be at least 6 characters' });
        }
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        const [r] = await db.query(
            'UPDATE staff_users SET password_hash = ? WHERE id = ? AND company_id = ?',
            [hash, req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'User not found' });
        res.json({ ok: true, message: 'Password updated.' });
    } catch (err) { next(err); }
};

// ── list roles ───────────────────────────────────────────────
const listRoles = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM roles WHERE is_active = 1 ORDER BY id');
        res.json(rows.map(r => {
            if (r.permissions && typeof r.permissions === 'string') {
                try { r.permissions = JSON.parse(r.permissions); } catch {}
            }
            return r;
        }));
    } catch (err) { next(err); }
};

// ── get role ─────────────────────────────────────────────────
const getRole = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM roles WHERE slug = ?', [req.params.slug]);
        if (!rows[0]) return res.status(404).json({ error: 'Role not found' });
        if (rows[0].permissions && typeof rows[0].permissions === 'string') {
            try { rows[0].permissions = JSON.parse(rows[0].permissions); } catch {}
        }
        res.json(rows[0]);
    } catch (err) { next(err); }
};

// ── my permissions ───────────────────────────────────────────
const myPermissions = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            `SELECT r.permissions FROM staff_users su
              JOIN roles r ON r.id = su.role_id
             WHERE su.id = ? AND su.company_id = ?`, [req.user?.id, req.companyId]
        );
        if (!rows[0]) return res.json({ permissions: {} });
        let perms = rows[0].permissions;
        if (typeof perms === 'string') { try { perms = JSON.parse(perms); } catch {} }
        res.json({ permissions: perms || {} });
    } catch (err) { next(err); }
};

module.exports = {
    listUsers, getUser, createUser, updateUser, toggleActive, resetPassword,
    listRoles, getRole, myPermissions
};
