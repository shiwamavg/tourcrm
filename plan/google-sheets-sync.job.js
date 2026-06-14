const cron = require('node-cron');
const { google } = require('googleapis');
const db = require('../config/db');

const CREDENTIALS_PATH = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_RANGE = process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A2:Z';

const getAuth = async () => {
    const auth = new google.auth.GoogleAuth({
        keyFile: CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    return auth.getClient();
};

const syncLeads = async () => {
    if (!SHEET_ID) {
        console.log('[Sheets Sync] GOOGLE_SHEET_ID not set, skipping.');
        return;
    }

    console.log('[Sheets Sync] Starting sync...');
    try {
        const authClient = await getAuth();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        // Get last synced row
        let syncState = await db.query(`SELECT * FROM sync_state WHERE sheet_id = $1`, [SHEET_ID]);
        let lastRow = 1;
        if (!syncState.rows.length) {
            await db.query(`INSERT INTO sync_state (sheet_id, last_synced_row) VALUES ($1, 1)`, [SHEET_ID]);
        } else {
            lastRow = syncState.rows[0].last_synced_row;
        }

        const startRow = lastRow + 1;
        const range = `Sheet1!A${startRow}:J`;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range
        });

        const rows = response.data.values || [];
        if (!rows.length) {
            console.log('[Sheets Sync] No new rows.');
            return;
        }

        // Expected columns: Name, Email, Phone, AlternatePhone, Destination, TravelDate, Adults, Children, Budget, AdID
        let imported = 0, skipped = 0;

        for (const row of rows) {
            const [name, email, phone, altPhone, destination, travelDate, adults, children, budget, adId] = row;
            if (!phone || !name) { skipped++; continue; }

            const existing = await db.query(
                `SELECT id FROM leads WHERE phone = $1 AND status NOT IN ('converted','not_converted','junked')`,
                [phone.trim()]
            );
            if (existing.rows.length) { skipped++; continue; }

            try {
                await db.query(`
                    INSERT INTO leads (full_name, email, phone, alternate_phone, destination_text,
                        travel_date_approx, pax_adults, pax_children, budget_approx, source, source_ref)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'google_sheet',$10)
                `, [name, email, phone, altPhone, destination,
                    travelDate || null, parseInt(adults) || 1,
                    parseInt(children) || 0, parseFloat(budget) || null, adId]);
                imported++;
            } catch (e) {
                console.error(`[Sheets Sync] Row error: ${e.message}`);
                skipped++;
            }
        }

        // Update sync state
        await db.query(
            `UPDATE sync_state SET last_synced_row = $1, last_synced_at = NOW() WHERE sheet_id = $2`,
            [lastRow + rows.length, SHEET_ID]
        );

        console.log(`[Sheets Sync] Done. Imported: ${imported}, Skipped: ${skipped}`);
    } catch (err) {
        console.error('[Sheets Sync] Error:', err.message);
    }
};

// Run every 15 minutes
cron.schedule('*/15 * * * *', syncLeads);

// Also run on startup
syncLeads();

console.log('[Sheets Sync] Cron job scheduled (every 15 min)');
