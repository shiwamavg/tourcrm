// src/controllers/followup-sequence.controller.js
const db = require('../config/db');
const { renderTemplate } = require('./message-template.controller');
const messageQueue = require('../services/message-queue.service');
const { logFollowup } = require('../services/followup.service');

const VALID_ACTIONS = new Set(['email', 'whatsapp', 'sms', 'call_task', 'system_note']);
const VALID_SOURCES = new Set([
    'manual', 'website_form', 'google_sheet', 'csv_upload',
    'meta_ads', 'walk_in', 'referral', 'whatsapp', 'phone', 'other', 'demo_request'
]);

const listSequences = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM followup_sequences WHERE company_id = ? ORDER BY name',
            [req.companyId]
        );
        res.json(rows);
    } catch (err) { next(err); }
};

const getSequence = async (req, res, next) => {
    try {
        const [[seq]] = await db.query(
            'SELECT * FROM followup_sequences WHERE id = ? AND company_id = ?',
            [req.params.id, req.companyId]
        );
        if (!seq) return res.status(404).json({ error: 'Sequence not found' });
        const [steps] = await db.query(
            `SELECT s.*, mt.name AS template_name
               FROM followup_sequence_steps s
               LEFT JOIN message_templates mt ON mt.id = s.template_id
              WHERE s.sequence_id = ?
           ORDER BY s.step_order`,
            [seq.id]
        );
        seq.steps = steps;
        res.json(seq);
    } catch (err) { next(err); }
};

const createSequence = async (req, res, next) => {
    try {
        const { name, source, steps = [], is_active } = req.body || {};
        if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
        if (source && !VALID_SOURCES.has(source)) {
            return res.status(400).json({ error: 'Invalid source' });
        }
        const [seq] = await db.query(
            `INSERT INTO followup_sequences (company_id, name, source, is_active)
             VALUES (?, ?, ?, ?)`,
            [req.companyId, name.trim(), source || null, is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        await saveSteps(seq.insertId, steps, req.companyId);
        res.status(201).json({ id: seq.insertId, name, source, is_active });
    } catch (err) { next(err); }
};

const updateSequence = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { name, source, steps, is_active } = req.body || {};
        const sets = [];
        const params = [];
        if (name !== undefined) { sets.push('name = ?'); params.push(name.trim()); }
        if (source !== undefined) { sets.push('source = ?'); params.push(source || null); }
        if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0); }
        if (sets.length) {
            params.push(id, req.companyId);
            await db.query(
                `UPDATE followup_sequences SET ${sets.join(', ')} WHERE id = ? AND company_id = ?`,
                params
            );
        }
        if (steps) await saveSteps(id, steps, req.companyId);
        res.json({ ok: true });
    } catch (err) { next(err); }
};

const deleteSequence = async (req, res, next) => {
    try {
        const [r] = await db.query(
            'DELETE FROM followup_sequences WHERE id = ? AND company_id = ?',
            [req.params.id, req.companyId]
        );
        if (!r.affectedRows) return res.status(404).json({ error: 'Sequence not found' });
        res.json({ ok: true });
    } catch (err) { next(err); }
};

async function saveSteps(sequenceId, steps, companyId) {
    await db.query('DELETE FROM followup_sequence_steps WHERE sequence_id = ?', [sequenceId]);
    for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        if (!VALID_ACTIONS.has(s.action_type)) continue;
        // validate template ownership
        if (s.template_id) {
            const [[t]] = await db.query('SELECT id FROM message_templates WHERE id = ? AND company_id = ?', [s.template_id, companyId]);
            if (!t) continue;
        }
        await db.query(
            `INSERT INTO followup_sequence_steps
                (sequence_id, step_order, delay_days, delay_hours, action_type, template_id, subject, body, followup_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [sequenceId, i + 1, s.delay_days || 0, s.delay_hours || 0, s.action_type,
             s.template_id || null, s.subject || null, s.body || null, s.followup_type || null]
        );
    }
}

/** Start a sequence for a lead. Called when a new lead matches a sequence source. */
async function startSequenceForLead(lead) {
    const [matches] = await db.query(
        `SELECT * FROM followup_sequences
          WHERE company_id = ? AND is_active = 1 AND (source IS NULL OR source = ?)
       ORDER BY source IS NULL, id`,
        [lead.company_id, lead.source]
    );
    for (const seq of matches) {
        const [[existing]] = await db.query(
            'SELECT id FROM lead_sequences WHERE lead_id = ? AND sequence_id = ?',
            [lead.id, seq.id]
        );
        if (existing) continue;
        const [steps] = await db.query(
            'SELECT * FROM followup_sequence_steps WHERE sequence_id = ? ORDER BY step_order',
            [seq.id]
        );
        if (!steps.length) continue;
        const firstStep = steps[0];
        const nextRun = new Date(Date.now() + (firstStep.delay_days * 86400000) + (firstStep.delay_hours * 3600000));
        await db.query(
            `INSERT INTO lead_sequences (company_id, lead_id, sequence_id, current_step_index, status, next_run_at)
             VALUES (?, ?, ?, 0, 'active', ?)`,
            [lead.company_id, lead.id, seq.id, nextRun]
        );
    }
}

/** Scheduler-facing: process all due sequence steps. */
async function processDueSteps() {
    const [due] = await db.query(
        `SELECT ls.*, l.full_name, l.email, l.phone, l.destination_text, c.name AS company_name
           FROM lead_sequences ls
           JOIN leads l ON l.id = ls.lead_id
           JOIN companies c ON c.id = ls.company_id
          WHERE ls.status = 'active' AND ls.next_run_at <= NOW()`
    );

    let processed = 0;
    for (const ls of due) {
        const [steps] = await db.query(
            'SELECT * FROM followup_sequence_steps WHERE sequence_id = ? ORDER BY step_order',
            [ls.sequence_id]
        );
        const step = steps[ls.current_step_index];
        if (!step) {
            await db.query(
                `UPDATE lead_sequences SET status = 'completed', completed_at = NOW() WHERE id = ?`,
                [ls.id]
            );
            continue;
        }

        await executeStep(step, ls);

        const nextIndex = ls.current_step_index + 1;
        const nextStep = steps[nextIndex];
        if (nextStep) {
            const nextRun = new Date(Date.now() + (nextStep.delay_days * 86400000) + (nextStep.delay_hours * 3600000));
            await db.query(
                `UPDATE lead_sequences SET current_step_index = ?, next_run_at = ? WHERE id = ?`,
                [nextIndex, nextRun, ls.id]
            );
        } else {
            await db.query(
                `UPDATE lead_sequences SET status = 'completed', completed_at = NOW(), current_step_index = ? WHERE id = ?`,
                [nextIndex, ls.id]
            );
        }
        processed++;
    }
    return processed;
}

async function executeStep(step, ls) {
    const values = {
        full_name: ls.full_name,
        email: ls.email || '',
        phone: ls.phone || '',
        destination: ls.destination_text || '',
        company_name: ls.company_name
    };

    if (step.action_type === 'email' || step.action_type === 'whatsapp' || step.action_type === 'sms') {
        let subject = step.subject || '';
        let body = step.body || '';
        if (step.template_id) {
            const [[template]] = await db.query('SELECT * FROM message_templates WHERE id = ?', [step.template_id]);
            if (template) {
                const rendered = renderTemplate(template, values);
                subject = rendered.subject;
                body = rendered.body;
            }
        }
        const recipient = step.action_type === 'email' ? ls.email : ls.phone;
        if (recipient) {
            await messageQueue.enqueue({
                company_id: ls.company_id,
                entity_type: 'lead',
                entity_id: ls.lead_id,
                channel: step.action_type,
                recipient,
                subject,
                body,
                scheduled_at: new Date()
            });
        }
        await logLeadSequenceLog(ls.id, step.id, step.action_type, recipient ? 'queued' : 'skipped', recipient);
    } else if (step.action_type === 'call_task') {
        const nextRemindAt = new Date(Date.now() + 3600000); // due in 1 hour
        await logFollowup(null, {
            company_id: ls.company_id,
            lead_id: ls.lead_id,
            user_id: 1,
            followup_type: step.followup_type || 'call',
            notes: `[Auto-sequence] ${step.body || 'Follow up with lead'}`,
            next_remind_at: nextRemindAt.toISOString().slice(0, 19).replace('T', ' '),
            is_system: 1
        });
        await logLeadSequenceLog(ls.id, step.id, 'call_task', 'sent', null);
    } else if (step.action_type === 'system_note') {
        await logFollowup(null, {
            company_id: ls.company_id,
            lead_id: ls.lead_id,
            user_id: 1,
            followup_type: 'other',
            notes: step.body || 'Auto sequence note',
            is_system: 1
        });
        await logLeadSequenceLog(ls.id, step.id, 'system_note', 'sent', null);
    }
}

async function logLeadSequenceLog(leadSequenceId, stepId, actionType, status, recipient) {
    await db.query(
        `INSERT INTO lead_sequence_logs (lead_sequence_id, step_id, action_type, status, recipient)
         VALUES (?, ?, ?, ?, ?)`,
        [leadSequenceId, stepId, actionType, status, recipient]
    );
}

module.exports = {
    listSequences, getSequence, createSequence, updateSequence, deleteSequence,
    startSequenceForLead, processDueSteps
};
