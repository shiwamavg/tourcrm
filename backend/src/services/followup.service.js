const db = require('../config/db');

/**
 * Logs a follow-up (manual or system milestone) and handles associated updates.
 *
 * @param {object} connOrDb - connection or db pool
 * @param {object} params - parameters for the follow-up
 * @param {number} params.company_id
 * @param {number} [params.lead_id]
 * @param {number} [params.quotation_id]
 * @param {number} [params.booking_id]
 * @param {number} params.user_id
 * @param {string} [params.followup_type] - 'call', 'email', 'whatsapp', 'meeting', 'site_visit', 'other'
 * @param {string} params.notes
 * @param {string} [params.rating] - 'hot', 'warm', 'cold'
 * @param {string} [params.next_remind_at] - YYYY-MM-DD HH:MM:SS
 * @param {number} [params.next_reminder_assignee] - user_id for reminder
 * @param {number} [params.is_system] - 0 or 1
 */
async function logFollowup(connOrDb, params) {
    const conn = connOrDb || db;
    const {
        company_id, lead_id, quotation_id, booking_id, user_id,
        followup_type = 'other', notes, rating, next_remind_at,
        next_reminder_assignee, is_system = 0
    } = params;

    let nextReminderId = null;

    // 1. Create reminder if next_remind_at is specified
    if (next_remind_at) {
        let title = 'Follow-up reminder';
        let entityType = 'general';
        let entityId = null;

        if (booking_id) {
            entityType = 'booking';
            entityId = booking_id;
            title = `Follow-up for Booking`;
        } else if (quotation_id) {
            entityType = 'quotation';
            entityId = quotation_id;
            title = `Follow-up for Quotation`;
        } else if (lead_id) {
            entityType = 'lead';
            entityId = lead_id;
            title = `Follow-up for Lead`;
        }

        const [remResult] = await conn.query(
            `INSERT INTO reminders (company_id, title, description, remind_at, entity_type, entity_id, user_id, assigned_to, channel, priority, followup_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_app', 'medium', ?)`,
            [
                company_id, title, notes.substring(0, 255), next_remind_at,
                entityType, entityId, user_id, next_reminder_assignee || user_id, followup_type
            ]
        );
        nextReminderId = remResult.insertId;

        // Also update the lead's follow_up_at if lead_id is provided
        if (lead_id) {
            await conn.query(
                `UPDATE leads SET follow_up_at = ? WHERE id = ? AND company_id = ?`,
                [next_remind_at, lead_id, company_id]
            );
        }
    }

    // 2. Update lead rating if rating is specified and lead_id exists
    if (rating && lead_id) {
        await conn.query(
            `UPDATE leads SET rating = ? WHERE id = ? AND company_id = ?`,
            [rating, lead_id, company_id]
        );
    }

    // 3. Insert the follow-up record
    const [folResult] = await conn.query(
        `INSERT INTO followups (company_id, lead_id, quotation_id, booking_id, user_id, followup_type, notes, rating, next_remind_at, next_reminder_id, is_system)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            company_id, lead_id || null, quotation_id || null, booking_id || null,
            user_id, followup_type, notes, rating || null, next_remind_at || null, nextReminderId, is_system
        ]
    );

    return folResult.insertId;
}

module.exports = { logFollowup };
