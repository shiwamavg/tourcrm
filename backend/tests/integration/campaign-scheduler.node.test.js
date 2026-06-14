import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';
import db from '../../src/config/db.js';
import { processAll } from '../../src/scripts/campaign-scheduler.js';

const TEST_PORT = process.env.TEST_PORT || 3031;
const base = `http://127.0.0.1:${TEST_PORT}`;

async function fetchJson(path, opts) {
  const r = await fetch(base + path, opts);
  const text = await r.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
  return { status: r.status, body };
}

async function waitForServer(timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) return;
    } catch (e) {}
    await wait(500);
  }
  throw new Error('Server did not become ready');
}

import { test } from 'node:test';

test('integration: campaign scheduler and whatsapp gateway', async () => {
  const server = spawn('node', ['src/server.js'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', PORT: TEST_PORT } });
  server.stdout?.on('data', () => {});
  server.stderr?.on('data', () => {});

  try {
    await waitForServer(20000);

    // 1. Super Admin login
    const saLogin = await fetchJson('/api/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@tourcrm.local', password: 'SuperAdmin@123' })
    });
    assert.equal(saLogin.status, 200, 'Super-admin login failed');
    const saToken = saLogin.body.access_token;

    // 2. Create an Enterprise company
    const uniq = `tenant${Date.now()}${Math.floor(Math.random()*1000)}`;
    const email = `${uniq}@example.test`;
    const password = 'Test1234!';
    
    // Find Enterprise package ID
    const packagesResp = await fetchJson('/api/subscription-packages');
    const enterprisePkg = packagesResp.body.find(p => p.slug === 'enterprise');
    assert.ok(enterprisePkg, 'Expected enterprise package in seed');

    const signupRes = await fetchJson('/api/super-admin/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({
        name: `Enterprise Co ${uniq}`,
        contact_name: 'Enterprise Admin',
        contact_email: email,
        contact_phone: '+918888877777',
        password,
        package_id: enterprisePkg.id
      })
    });
    assert.equal(signupRes.status, 201, 'Signup failed: ' + JSON.stringify(signupRes.body));
    const companyId = signupRes.body.id;

    // Activate company
    await fetchJson(`/api/super-admin/companies/${companyId}/toggle-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({ status: 'active' })
    });

    // 3. Login as Enterprise tenant
    const loginRes = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.equal(loginRes.status, 200, 'Login failed');
    const tenantToken = loginRes.body.access_token;

    // 4. Create a Lead
    const leadRes = await fetchJson('/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        full_name: 'Lead Test User',
        phone: '+919999900002',
        email: `tester${uniq}@example.test`,
        destination_text: 'Goa'
      })
    });
    assert.equal(leadRes.status, 201, 'Lead creation failed');
    const leadId = leadRes.body.id;

    // 5. Create a scheduled Email Campaign
    const campRes = await fetchJson('/api/email-campaigns', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        name: 'Winter Tour Promo',
        subject: 'Discount on Winter Travel Packages!',
        body_text: 'Get 20% off all packages booked this week.',
        scheduled_at: new Date(Date.now() - 10000).toISOString() // scheduled in past to fire immediately
      })
    });
    assert.equal(campRes.status, 201, 'Campaign creation failed');
    const campaignId = campRes.body.id;

    // Manually mark campaign as 'scheduled' (since creation might default status to draft)
    await db.query("UPDATE email_campaigns SET status = 'scheduled' WHERE id = ?", [campaignId]);

    // 6. Create a pending Reminder
    const remRes = await fetchJson('/api/reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        title: 'Call Client regarding Hotel Rates',
        description: 'Verify if they need premium rooms.',
        remind_at: new Date(Date.now() - 10000).toISOString(), // past
        channel: 'email'
      })
    });
    assert.equal(remRes.status, 201, 'Reminder creation failed');
    const reminderId = remRes.body.id;

    // Create a WhatsApp channel reminder linked to the lead
    const waRemRes = await fetchJson('/api/reminders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        title: 'WhatsApp Itinerary Link',
        description: 'Send booking itinerary detail link.',
        remind_at: new Date(Date.now() - 10000).toISOString(),
        channel: 'whatsapp',
        entity_type: 'lead',
        entity_id: leadId
      })
    });
    assert.equal(waRemRes.status, 201, 'WhatsApp reminder creation failed');
    const waReminderId = waRemRes.body.id;

    // 7. Execute background scheduler manually
    await processAll();

    // 8. Assertions - Campaign table status check
    const [[campRow]] = await db.query('SELECT * FROM email_campaigns WHERE id = ?', [campaignId]);
    assert.equal(campRow.status, 'sent', 'Expected campaign to be sent');
    assert.ok(campRow.sent_at, 'Expected campaign sent_at to be set');
    assert.equal(campRow.sent_count, 1, 'Expected campaign to have sent to the 1 lead');

    // 9. Assertions - Reminders status check
    const [[remRow]] = await db.query('SELECT * FROM reminders WHERE id = ?', [reminderId]);
    assert.equal(remRow.status, 'sent', 'Expected email reminder to be sent');
    assert.ok(remRow.sent_at, 'Expected email reminder sent_at to be set');

    const [[waRemRow]] = await db.query('SELECT * FROM reminders WHERE id = ?', [waReminderId]);
    assert.equal(waRemRow.status, 'sent', 'Expected WhatsApp reminder to be sent');
    assert.ok(waRemRow.sent_at, 'Expected WhatsApp reminder sent_at to be set');

    // 10. Assertions - WhatsApp API endpoint verify
    const waSendRes = await fetchJson('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tenantToken}`
      },
      body: JSON.stringify({
        to: '+919999900002',
        message: 'This is a test WhatsApp proposal link'
      })
    });
    assert.equal(waSendRes.status, 200);
    assert.equal(waSendRes.body.mock, true, 'Expected mock sender to log message');

  } finally {
    try { server.kill(); } catch (e) {}
    try { await db.end(); } catch (e) {}
  }
}, { timeout: 120000 });
