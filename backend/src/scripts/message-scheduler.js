// src/scripts/message-scheduler.js
// Background processor for:
//   - payment reminders
//   - auto-follow-up sequences
//   - message queue dispatch (email/WhatsApp/SMS)

const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const paymentReminderCtl = require('../controllers/payment-reminder.controller');
const followupSequenceCtl = require('../controllers/followup-sequence.controller');
const messageQueue = require('../services/message-queue.service');

const LOG_DIR = path.resolve(process.cwd(), 'logs');
try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch (e) {}

function appendLog(file, msg) {
    const time = new Date().toISOString();
    fs.appendFileSync(path.join(LOG_DIR, file), `[${time}] ${msg}\n`);
}

async function run() {
    console.log(`[${new Date().toISOString()}] Starting message scheduler...`);
    appendLog('message-scheduler.log', 'Scheduler run started');

    try {
        const queuedReminders = await paymentReminderCtl.processDueReminders();
        console.log(`[Payment Reminders] Queued ${queuedReminders} reminders.`);
        appendLog('message-scheduler.log', `Queued ${queuedReminders} payment reminders`);
    } catch (err) {
        console.error('Payment reminder processing failed:', err);
        appendLog('message-scheduler.log', `ERROR payment reminders: ${err.message}`);
    }

    try {
        const processedSteps = await followupSequenceCtl.processDueSteps();
        console.log(`[Follow-up Sequences] Processed ${processedSteps} steps.`);
        appendLog('message-scheduler.log', `Processed ${processedSteps} follow-up sequence steps`);
    } catch (err) {
        console.error('Follow-up sequence processing failed:', err);
        appendLog('message-scheduler.log', `ERROR follow-up sequences: ${err.message}`);
    }

    try {
        const dispatched = await messageQueue.processQueue(200);
        console.log(`[Message Queue] Dispatched ${dispatched} messages.`);
        appendLog('message-scheduler.log', `Dispatched ${dispatched} queued messages`);
    } catch (err) {
        console.error('Message queue processing failed:', err);
        appendLog('message-scheduler.log', `ERROR message queue: ${err.message}`);
    }

    console.log(`[${new Date().toISOString()}] Message scheduler completed.`);
    appendLog('message-scheduler.log', 'Scheduler run completed');
}

if (require.main === module) {
    run().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
} else {
    module.exports = { run };
}
