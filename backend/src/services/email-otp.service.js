// src/services/email-otp.service.js
// Customer-portal OTP delivery. Two modes:
//
//   EMAIL_MODE=console  (default) – log the OTP to the backend console.
//                                    Ideal for dev / sandbox demos where
//                                    no real email provider is wired up.
//   EMAIL_MODE=smtp     – send the email through nodemailer (not
//                                    implemented in this build; the
//                                    settings in .env are placeholders).
//
// The OTP itself is a 6-digit numeric code, valid for 10 minutes. We
// store SHA-256(otp) in `customer_otps.code_hash` so the raw value is
// never persisted, only the hash. Verification is constant-time safe.

const crypto = require('crypto');
const db     = require('../config/db');

const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const hashOtp = (code) =>
    crypto.createHash('sha256').update(String(code)).digest('hex');

const generateCode = () => {
    // 6-digit zero-padded numeric code
    const n = crypto.randomInt(0, 1_000_000);
    return n.toString().padStart(6, '0');
};

/** Create a new OTP for the given email, invalidate any earlier un-used ones. */
const issueOtp = async (email, meta = {}) => {
    const code = generateCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000);

    // Invalidate any prior unconsumed OTPs for this email so a user can't
    // hop between multiple valid codes.
    await db.query(
        `UPDATE customer_otps
            SET consumed = 1, consumed_at = NOW()
          WHERE email = ? AND consumed = 0`,
        [email]
    );

    await db.query(
        `INSERT INTO customer_otps
            (email, code_hash, expires_at, ip_address, user_agent)
         VALUES (?,?,?,?,?)`,
        [email, codeHash, expiresAt, meta.ip || null, (meta.userAgent || '').slice(0, 255)]
    );

    // Deliver
    if ((process.env.EMAIL_MODE || 'console') === 'smtp') {
        // SMTP not implemented in this build. Fall through to console.
        console.warn('[otp] EMAIL_MODE=smtp requested but SMTP is not configured; logging instead.');
    }
    console.log(`\n┌────────────────────────────────────────────────────────────┐`);
    console.log(`│  OTP for ${email.padEnd(48)}│`);
    console.log(`│  Code: ${code.padEnd(49)}│`);
    console.log(`│  Valid for ${TTL_MINUTES} minutes${' '.repeat(Math.max(0, 38 - String(TTL_MINUTES).length))}│`);
    console.log(`└────────────────────────────────────────────────────────────┘\n`);

    return { code, expiresAt, devDelivered: true };
};

/** Verify an OTP. Returns { ok: true, email } on success, { ok: false, reason } on failure. */
const verifyOtp = async (email, code) => {
    if (!code || !/^\d{4,8}$/.test(String(code))) {
        return { ok: false, reason: 'invalid_code_format' };
    }
    const codeHash = hashOtp(code);

    // Most-recent unconsumed, unexpired OTP for this email
    const [rows] = await db.query(
        `SELECT id, code_hash, attempts, expires_at, consumed
           FROM customer_otps
          WHERE email = ? AND consumed = 0
          ORDER BY id DESC
          LIMIT 1`,
        [email]
    );
    const row = rows[0];
    if (!row) return { ok: false, reason: 'no_active_otp' };
    if (new Date(row.expires_at).getTime() < Date.now()) {
        await db.query('UPDATE customer_otps SET consumed = 1, consumed_at = NOW() WHERE id = ?', [row.id]);
        return { ok: false, reason: 'expired' };
    }
    if (row.attempts >= MAX_ATTEMPTS) {
        await db.query('UPDATE customer_otps SET consumed = 1, consumed_at = NOW() WHERE id = ?', [row.id]);
        return { ok: false, reason: 'too_many_attempts' };
    }

    // Use a constant-time compare to avoid timing leaks
    const a = Buffer.from(row.code_hash, 'hex');
    const b = Buffer.from(codeHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        await db.query('UPDATE customer_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
        return { ok: false, reason: 'wrong_code' };
    }

    // Success – burn this OTP
    await db.query('UPDATE customer_otps SET consumed = 1, consumed_at = NOW() WHERE id = ?', [row.id]);
    return { ok: true, email };
};

module.exports = { issueOtp, verifyOtp, TTL_MINUTES, MAX_ATTEMPTS };
