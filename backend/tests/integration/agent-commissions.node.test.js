import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';
import { test } from 'node:test';

const TEST_PORT = process.env.TEST_PORT || 3012;
const base = `http://127.0.0.1:${TEST_PORT}`;

async function fetchJson(path, opts) {
    const r = await fetch(base + path, opts);
    const text = await r.text();
    let body = text;
    try { body = JSON.parse(text); } catch (e) {}
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
    throw new Error('Server did not become ready in time');
}

async function runAgentCommissionFlow() {
    console.log('Logging in as super-admin...');
    let res = await fetchJson('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'superadmin@tourcrm.local', password: 'SuperAdmin@123' })
    });
    assert.equal(res.status, 200, 'Super-admin login failed');
    const saToken = res.body.access_token;

    console.log('Creating a new tenant company...');
    const uniq = `b2b${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const compName = `B2B-Tenant-${uniq}`;
    const compEmail = `${uniq}@example.test`;
    const compPw = 'B2bPw!1234';

    res = await fetchJson('/api/super-admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({
            name: compName,
            contact_name: 'B2B Admin',
            contact_email: compEmail,
            contact_phone: '+919988776655',
            password: compPw
        })
    });
    assert.ok(res.status >= 200 && res.status < 300, 'Create company failed');
    const company = res.body;

    console.log('Activating company...');
    await fetchJson(`/api/super-admin/companies/${company.id}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${saToken}` },
        body: JSON.stringify({ status: 'active' })
    });

    console.log('Logging in as tenant admin...');
    res = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: compEmail, password: compPw })
    });
    assert.equal(res.status, 200, 'Tenant login failed');
    const tenantToken = res.body.access_token;

    console.log('Signing up a B2B Agent...');
    const agentEmail = `agent-${uniq}@agency.test`;
    res = await fetchJson('/api/agent/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agency_name: 'Super B2B Agency',
            agent_name: 'Agent Ram',
            email: agentEmail,
            phone: '+919543210987',
            password: 'agentpassword',
            company_id: company.id
        })
    });
    assert.equal(res.status, 201, 'Agent signup failed: ' + JSON.stringify(res.body));
    const agentId = res.body.id;

    console.log('Listing agents as Admin (verify pending status)...');
    res = await fetchJson('/api/admin/agents?status=pending', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.equal(res.status, 200);
    assert.ok(res.body.items.some(a => a.id === agentId), 'Agent not found in pending list');

    console.log('Approving B2B Agent and setting commission rate to 12%...');
    res = await fetchJson(`/api/admin/agents/${agentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tenantToken}` },
        body: JSON.stringify({
            status: 'approved',
            commission_type: 'percentage',
            commission_rate: 12.00
        })
    });
    assert.equal(res.status, 200, 'Agent approval failed');

    console.log('Logging in as B2B Agent...');
    res = await fetchJson('/api/agent/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: agentEmail, password: 'agentpassword', company_id: company.id })
    });
    assert.equal(res.status, 200, 'Agent login failed');
    const agentToken = res.body.access_token;

    console.log('Agent submitting a trip request...');
    res = await fetchJson('/api/agent/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agentToken}` },
        body: JSON.stringify({
            full_name: 'Himalayan Explorer',
            email: 'explorer@gmail.test',
            phone: '+918877665544',
            destination_text: 'Sikkim 5 Days',
            notes: 'Budget family trip'
        })
    });
    assert.equal(res.status, 201, 'Agent trip submission failed');
    const leadId = res.body.id;

    console.log('Admin converting lead to quotation...');
    res = await fetchJson(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.equal(res.status, 201, 'Convert lead failed');
    const quotationId = res.body.quotation_id;

    console.log('Updating quotation values to test commission percentage...');
    // We update the quotation with subtotal of ₹10,000 to verify 12% commission (₹1,200)
    // Note: We need a valid destination for company/tenant. We can use a seeded one or get the default.
    // Let's seed a destination for this dynamic company, or we can just fetch and use the first destination.
    res = await fetchJson('/api/admin/destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tenantToken}` },
        body: JSON.stringify({ name: 'Gangtok', state: 'Sikkim' })
    });
    assert.equal(res.status, 201);
    const destId = res.body.id;

    // Create car type/rate to calculate subtotal
    res = await fetchJson('/api/admin/settings', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    
    // We update the quotation subtotal by adding a misc item worth ₹10,000
    res = await fetchJson(`/api/quotations/${quotationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tenantToken}` },
        body: JSON.stringify({
            customer_name: 'Himalayan Explorer',
            customer_phone: '+918877665544',
            destination_id: destId,
            destination_text: 'Sikkim 5 Days',
            trip_start_date: '2026-07-01',
            trip_end_date: '2026-07-06',
            package_type: 'hotel_car',
            adults: 2,
            markup_pct: 10,
            gst_pct: 5,
            agent_id: agentId,
            misc: [
                { label: 'Agent Package Charge', amount: 10000.00 }
            ]
        })
    });
    assert.equal(res.status, 200, 'Quotation update failed: ' + JSON.stringify(res.body));
    // Verify agent_commission in quotation response (12% of ₹10,000 subtotal = ₹1,200)
    assert.equal(Number(res.body.agent_commission), 1200.00, 'Quotation commission calculation wrong');

    console.log('Admin creating a booking from the quotation...');
    res = await fetchJson('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tenantToken}` },
        body: JSON.stringify({ quotation_id: quotationId })
    });
    assert.equal(res.status, 201, 'Create booking failed');
    const bookingId = res.body.id;

    // Verify booking has agent_id and agent_commission
    assert.equal(res.body.agent_id, agentId);
    assert.equal(Number(res.body.agent_commission), 1200.00);

    console.log('Listing commissions as Admin...');
    res = await fetchJson('/api/admin/commissions?status=pending', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.equal(res.status, 200);
    const comm = res.body.items.find(c => c.booking_id === bookingId);
    assert.ok(comm, 'Commission record not found for booking');
    assert.equal(Number(comm.amount), 1200.00);

    console.log('Admin recording commission payout...');
    res = await fetchJson(`/api/admin/commissions/${comm.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tenantToken}` },
        body: JSON.stringify({ payment_reference: 'TXN-987654321', notes: 'Monthly settlement' })
    });
    assert.equal(res.status, 200, 'Payout record failed');
    assert.equal(res.body.status, 'paid');
    assert.equal(res.body.payment_reference, 'TXN-987654321');

    console.log('Agent verifying dashboard values...');
    res = await fetchJson('/api/agent/dashboard', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${agentToken}` }
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.metrics.total_trips, 1);
    assert.equal(res.body.metrics.earned_commission, 1200.00);
    assert.equal(res.body.metrics.paid_commission, 1200.00);
    assert.equal(res.body.metrics.pending_payout, 0.00);

    console.log('B2B Agent & Commission Flow verified successfully!');
}

test('integration: agent commissions full workflow', async (t) => {
    const server = spawn('node', ['src/server.js'], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: 'test', PORT: TEST_PORT }
    });
    server.stdout?.on('data', d => { console.log('[Server STDOUT]', d.toString().trim()); });
    server.stderr?.on('data', d => { console.error('[Server STDERR]', d.toString().trim()); });

    try {
        await waitForServer(20000);
        await runAgentCommissionFlow();
    } finally {
        try { server.kill(); } catch (e) {}
    }
}, { timeout: 120_000 });
