// src/scripts/seed-admin.js
// Creates a default admin user. Run with: npm run seed:admin
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const ADMIN = {
    full_name: 'Admin User',
    email: 'admin@tourcrm.local',
    phone: '9999999999',
    password: 'Admin@123',
    role: 'admin'
};

(async () => {
    try {
        const hash = await bcrypt.hash(ADMIN.password, 10);
        const [existing] = await db.query('SELECT id FROM staff_users WHERE email = ?', [ADMIN.email]);
        if (existing.length) {
            console.log(`✓ Admin already exists: ${ADMIN.email}`);
        } else {
            await db.query(
                'INSERT INTO staff_users (full_name, email, phone, password_hash, role) VALUES (?,?,?,?,?)',
                [ADMIN.full_name, ADMIN.email, ADMIN.phone, hash, ADMIN.role]
            );
            console.log(`✓ Created admin: ${ADMIN.email} / ${ADMIN.password}`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Failed to seed admin:', err);
        process.exit(1);
    }
})();
