// src/controllers/agent.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');

const signAgentToken = (agent) =>
    jwt.sign(
        {
            sub: agent.id,
            role: 'agent',
            email: agent.email,
            agency_name: agent.agency_name,
            company_id: agent.company_id
        },
        env.jwt.secret,
        { expiresIn: '24h' }
    );

const signup = async (req, res, next) => {
    try {
        const { agency_name, agent_name, email, phone, password, company_id } = req.body || {};

        if (!agency_name?.trim() || !agent_name?.trim() || !email?.trim() || !phone?.trim() || !password) {
            return res.status(400).json({ error: 'All fields (agency_name, agent_name, email, phone, password) are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        // default company_id to 1 (Sikkim Trails Travel) if not provided
        const compId = Number(company_id) || 1;

        // Check if agent already exists in this company
        const [existing] = await db.query(
            'SELECT id FROM agents WHERE email = ? AND company_id = ? LIMIT 1',
            [normalizedEmail, compId]
        );
        if (existing[0]) {
            return res.status(409).json({ error: 'Email already registered under this agency' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO agents (company_id, agency_name, agent_name, email, phone, password_hash, status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [compId, agency_name.trim(), agent_name.trim(), normalizedEmail, phone.trim(), passwordHash]
        );

        res.status(201).json({
            id: result.insertId,
            agency_name: agency_name.trim(),
            agent_name: agent_name.trim(),
            email: normalizedEmail,
            status: 'pending',
            message: 'Agent registration submitted successfully. Pending admin approval.'
        });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password, company_id } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const compId = Number(company_id) || 1;

        const [rows] = await db.query(
            'SELECT * FROM agents WHERE email = ? AND company_id = ? LIMIT 1',
            [normalizedEmail, compId]
        );
        const agent = rows[0];

        if (!agent) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (agent.status === 'pending') {
            return res.status(403).json({ error: 'Your agent account is pending approval by the administrator.' });
        }
        if (agent.status === 'rejected') {
            return res.status(403).json({ error: 'Your agent registration request was rejected.' });
        }
        if (agent.status === 'inactive') {
            return res.status(403).json({ error: 'Your agent account is currently deactivated.' });
        }

        const isMatch = await bcrypt.compare(password, agent.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signAgentToken(agent);
        res.json({
            access_token: token,
            agent: {
                id: agent.id,
                agency_name: agent.agency_name,
                agent_name: agent.agent_name,
                email: agent.email,
                phone: agent.phone,
                company_id: agent.company_id,
                status: agent.status
            }
        });
    } catch (err) {
        next(err);
    }
};

const getDashboard = async (req, res, next) => {
    try {
        const agentId = req.agent.id;

        // Total Trips submitted (leads)
        const [[{ total_trips }]] = await db.query(
            'SELECT COUNT(*) as total_trips FROM leads WHERE agent_id = ?',
            [agentId]
        );

        // Pending Trips (leads not converted/lost, or bookings pending/confirmed)
        const [[{ pending_trips }]] = await db.query(
            `SELECT COUNT(*) as pending_trips FROM leads l
             LEFT JOIN quotations q ON q.lead_id = l.id
             LEFT JOIN bookings b ON b.quotation_id = q.id
             WHERE l.agent_id = ? AND (l.status NOT IN ('converted', 'lost') OR (b.id IS NOT NULL AND b.status IN ('pending', 'confirmed')))`,
            [agentId]
        );

        // Total commissions earned (approved or paid)
        const [[{ earned_commission }]] = await db.query(
            "SELECT COALESCE(SUM(amount), 0) as earned_commission FROM commissions WHERE agent_id = ? AND status IN ('approved', 'paid')",
            [agentId]
        );

        // Total commissions paid
        const [[{ paid_commission }]] = await db.query(
            "SELECT COALESCE(SUM(amount), 0) as paid_commission FROM commissions WHERE agent_id = ? AND status = 'paid'",
            [agentId]
        );

        res.json({
            metrics: {
                total_trips,
                pending_trips,
                earned_commission: Number(earned_commission),
                paid_commission: Number(paid_commission),
                pending_payout: Number(earned_commission) - Number(paid_commission)
            }
        });
    } catch (err) {
        next(err);
    }
};

const submitTrip = async (req, res, next) => {
    try {
        const agentId = req.agent.id;
        const companyId = req.agent.company_id;
        const { full_name, email, phone, destination_text, notes } = req.body || {};

        if (!full_name?.trim() || !phone?.trim()) {
            return res.status(400).json({ error: 'Client full_name and phone are required' });
        }

        const [result] = await db.query(
            `INSERT INTO leads (company_id, full_name, email, phone, destination_text, source, notes, agent_id)
             VALUES (?, ?, ?, ?, ?, 'agent', ?, ?)`,
            [companyId, full_name.trim(), email?.trim() || null, phone.trim(), destination_text?.trim() || null, notes?.trim() || null, agentId]
        );

        res.status(201).json({
            id: result.insertId,
            full_name: full_name.trim(),
            destination_text: destination_text?.trim() || null,
            status: 'new',
            message: 'Trip request submitted successfully'
        });
    } catch (err) {
        next(err);
    }
};

const getTrips = async (req, res, next) => {
    try {
        const agentId = req.agent.id;

        const [trips] = await db.query(
            `SELECT l.id as lead_id, l.full_name as client_name, l.destination_text, l.status as lead_status, l.created_at,
                    b.id as booking_id, b.booking_number, b.status as booking_status, b.total_amount
             FROM leads l
             LEFT JOIN quotations q ON q.lead_id = l.id
             LEFT JOIN bookings b ON b.quotation_id = q.id
             WHERE l.agent_id = ?
             ORDER BY l.id DESC`,
            [agentId]
        );

        res.json(trips);
    } catch (err) {
        next(err);
    }
};

const getCommissions = async (req, res, next) => {
    try {
        const agentId = req.agent.id;

        const [commissions] = await db.query(
            `SELECT c.id, c.amount, c.status, c.payment_reference, c.paid_at, c.notes, c.created_at,
                    b.booking_number, b.total_amount, b.customer_name as client_name
             FROM commissions c
             JOIN bookings b ON b.id = c.booking_id
             WHERE c.agent_id = ?
             ORDER BY c.id DESC`,
            [agentId]
        );

        res.json(commissions);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    signup,
    login,
    getDashboard,
    submitTrip,
    getTrips,
    getCommissions
};
