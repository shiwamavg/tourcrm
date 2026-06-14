const db = require('../config/db');
const { logFollowup } = require('../services/followup.service');

const VALID_STATUSES = new Set(['new', 'contacted', 'qualified', 'converted', 'lost', 'junk']);
const VALID_TYPES = new Set(['call', 'email', 'whatsapp', 'meeting', 'site_visit', 'other']);

async function createFollowup(req, res) {
    const companyId = req.companyId;
    const userId = req.user.id;
    const {
        lead_id, quotation_id, booking_id, followup_type, notes,
        rating, next_remind_at, next_reminder_assignee, status
    } = req.body;

    if (!notes || !notes.trim()) {
        return res.status(400).json({ error: 'Follow-up notes are required.' });
    }

    if (followup_type && !VALID_TYPES.has(followup_type)) {
        return res.status(400).json({ error: `Invalid follow-up type.` });
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // If status needs updating
        if (status && lead_id) {
            if (!VALID_STATUSES.has(status)) {
                await conn.rollback();
                return res.status(400).json({ error: `Invalid lead status: ${status}` });
            }
            // Get old status to log the change
            const [[lead]] = await conn.query('SELECT status FROM leads WHERE id = ? AND company_id = ?', [lead_id, companyId]);
            if (lead && lead.status !== status) {
                await conn.query('UPDATE leads SET status = ? WHERE id = ? AND company_id = ?', [status, lead_id, companyId]);
                // Insert a system milestone log
                await logFollowup(conn, {
                    company_id: companyId,
                    lead_id,
                    user_id: userId,
                    is_system: 1,
                    notes: `Status changed from "${lead.status}" to "${status}"`
                });
            }
        }

        const followupId = await logFollowup(conn, {
            company_id: companyId,
            lead_id,
            quotation_id,
            booking_id,
            user_id: userId,
            followup_type,
            notes,
            rating,
            next_remind_at,
            next_reminder_assignee,
            is_system: 0
        });

        await conn.commit();
        res.status(201).json({ id: followupId, message: 'Follow-up logged successfully.' });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
}

async function getJourney(req, res) {
    const companyId = req.companyId;
    let { lead_id, quotation_id, booking_id } = req.query;

    try {
        let targetLeadId = lead_id ? parseInt(lead_id, 10) : null;
        let targetQuotationId = quotation_id ? parseInt(quotation_id, 10) : null;
        let targetBookingId = booking_id ? parseInt(booking_id, 10) : null;

        // Resolve parent Lead ID
        if (targetBookingId && !targetLeadId) {
            const [[b]] = await db.query(
                'SELECT quotation_id FROM bookings WHERE id = ? AND company_id = ?',
                [targetBookingId, companyId]
            );
            if (b && b.quotation_id) {
                targetQuotationId = b.quotation_id;
            }
        }

        if (targetQuotationId && !targetLeadId) {
            const [[q]] = await db.query(
                'SELECT lead_id FROM quotations WHERE id = ? AND company_id = ?',
                [targetQuotationId, companyId]
            );
            if (q && q.lead_id) {
                targetLeadId = q.lead_id;
            }
        }

        let leadInfo = null;
        let quotations = [];
        let bookings = [];

        if (targetLeadId) {
            // Load lead info
            const [[lead]] = await db.query(
                'SELECT id, full_name, email, phone, status, rating, source, follow_up_at, created_at FROM leads WHERE id = ? AND company_id = ?',
                [targetLeadId, companyId]
            );
            leadInfo = lead || null;

            // Get all quotations for this lead
            const [quotes] = await db.query(
                'SELECT id, quotation_number FROM quotations WHERE lead_id = ? AND company_id = ?',
                [targetLeadId, companyId]
            );
            quotations = quotes || [];

            // Get all bookings for these quotations
            if (quotations.length > 0) {
                const quoteIds = quotations.map(q => q.id);
                const [bks] = await db.query(
                    'SELECT id, booking_number, quotation_id FROM bookings WHERE quotation_id IN (?) AND company_id = ?',
                    [quoteIds, companyId]
                );
                bookings = bks || [];
            }
        } else {
            // Fallback if no lead is associated (e.g. direct quotation/booking)
            if (targetQuotationId) {
                const [[q]] = await db.query(
                    'SELECT id, quotation_number FROM quotations WHERE id = ? AND company_id = ?',
                    [targetQuotationId, companyId]
                );
                if (q) quotations = [q];

                const [bks] = await db.query(
                    'SELECT id, booking_number, quotation_id FROM bookings WHERE quotation_id = ? AND company_id = ?',
                    [targetQuotationId, companyId]
                );
                bookings = bks || [];
            } else if (targetBookingId) {
                const [[b]] = await db.query(
                    'SELECT id, booking_number, quotation_id FROM bookings WHERE id = ? AND company_id = ?',
                    [targetBookingId, companyId]
                );
                if (b) {
                    bookings = [b];
                    if (b.quotation_id) {
                        const [[q]] = await db.query(
                            'SELECT id, quotation_number FROM quotations WHERE id = ? AND company_id = ?',
                            [b.quotation_id, companyId]
                        );
                        if (q) quotations = [q];
                    }
                }
            }
        }

        // Compile all IDs to fetch followups
        const leadIds = targetLeadId ? [targetLeadId] : [];
        const quotationIds = quotations.map(q => q.id);
        const bookingIds = bookings.map(b => b.id);

        let followupRows = [];
        if (leadIds.length || quotationIds.length || bookingIds.length) {
            const whereClauses = [];
            const params = [companyId];

            if (leadIds.length) {
                whereClauses.push('f.lead_id IN (?)');
                params.push(leadIds);
            }
            if (quotationIds.length) {
                whereClauses.push('f.quotation_id IN (?)');
                params.push(quotationIds);
            }
            if (bookingIds.length) {
                whereClauses.push('f.booking_id IN (?)');
                params.push(bookingIds);
            }

            const sql = `
                SELECT f.*, su.full_name AS user_name,
                       q.quotation_number, b.booking_number
                  FROM followups f
             LEFT JOIN staff_users su ON f.user_id = su.id AND su.company_id = f.company_id
             LEFT JOIN quotations q ON f.quotation_id = q.id AND q.company_id = f.company_id
             LEFT JOIN bookings b ON f.booking_id = b.id AND b.company_id = f.company_id
                 WHERE f.company_id = ? AND (${whereClauses.join(' OR ')})
              ORDER BY f.created_at ASC, f.id ASC
            `;

            const [rows] = await db.query(sql, params);
            followupRows = rows;
        }

        res.json({
            lead: leadInfo,
            quotations,
            bookings,
            journey: followupRows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function listFollowups(req, res) {
    const companyId = req.companyId;
    const { lead_id, quotation_id, booking_id } = req.query;
    try {
        const where = ['company_id = ?'];
        const params = [companyId];

        if (lead_id) { where.push('lead_id = ?'); params.push(lead_id); }
        if (quotation_id) { where.push('quotation_id = ?'); params.push(quotation_id); }
        if (booking_id) { where.push('booking_id = ?'); params.push(booking_id); }

        const [rows] = await db.query(
            `SELECT f.*, su.full_name AS user_name
               FROM followups f
          LEFT JOIN staff_users su ON f.user_id = su.id AND su.company_id = f.company_id
              WHERE ${where.join(' AND ')}
           ORDER BY f.id DESC`,
            params
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function deleteFollowup(req, res) {
    const companyId = req.companyId;
    const id = req.params.id;
    try {
        const [result] = await db.query(
            'DELETE FROM followups WHERE id = ? AND company_id = ?',
            [id, companyId]
        );
        if (!result.affectedRows) return res.status(404).json({ error: 'Follow-up not found' });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    createFollowup,
    getJourney,
    listFollowups,
    deleteFollowup
};
