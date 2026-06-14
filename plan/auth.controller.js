const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const createTokens = (user) => {
    const access = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.full_name },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    const refresh = jwt.sign(
        { id: user.id, type: 'refresh' },
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + '_refresh',
        { expiresIn: '7d' }
    );
    return { access, refresh };
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const result = await db.query(
            `SELECT * FROM staff_users WHERE email = $1 AND is_active = true`, [email]
        );
        if (!result.rows.length) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        await db.query(`UPDATE staff_users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

        const { access, refresh } = createTokens(user);

        // Store refresh token hash
        const refreshHash = await bcrypt.hash(refresh, 8);
        await db.query(`
            INSERT INTO refresh_tokens (staff_id, token_hash, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '7 days')
        `, [user.id, refreshHash]);

        res.json({
            access_token: access,
            refresh_token: refresh,
            user: { id: user.id, name: user.full_name, email: user.email, role: user.role }
        });
    } catch (err) { next(err); }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refresh_token } = req.body;
        let decoded;
        try {
            decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET + '_refresh');
        } catch {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const user = await db.query(
            `SELECT * FROM staff_users WHERE id = $1 AND is_active = true`, [decoded.id]
        );
        if (!user.rows.length) return res.status(401).json({ error: 'User not found' });

        const { access } = createTokens(user.rows[0]);
        res.json({ access_token: access });
    } catch (err) { next(err); }
};

const me = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, full_name, email, role, phone, created_at FROM staff_users WHERE id = $1`,
            [req.user.id]
        );
        res.json(result.rows[0]);
    } catch (err) { next(err); }
};

module.exports = { login, refreshToken, me };
