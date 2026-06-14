import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';
import { test } from 'node:test';

const TEST_PORT = process.env.TEST_PORT || 3025;
const base = `http://127.0.0.1:${TEST_PORT}`;

async function fetchJson(path, opts) {
  const r = await fetch(base + path, opts);
  const text = await r.text();
  let body = text;
  try { body = JSON.parse(text); } catch (e) {}
  return { status: r.status, body, headers: r.headers };
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

test('integration: competitor features (B2B network, GDS Search, Flyers, Reports)', async () => {
  const server = spawn('node', ['src/server.js'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', PORT: TEST_PORT } });
  server.stdout?.on('data', () => {});
  server.stderr?.on('data', () => {});

  try {
    await waitForServer(20000);

    // 1. Log in as Super Admin
    const saLogin = await fetchJson('/api/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@tourcrm.local', password: 'SuperAdmin@123' })
    });
    assert.equal(saLogin.status, 200, 'Super admin login failed');
    const saToken = saLogin.body.access_token;

    // Get Enterprise package ID (which has b2b, supplier, and reports features)
    const pkgsRes = await fetchJson('/api/subscription-packages');
    const enterprisePkg = pkgsRes.body.find(p => p.slug === 'enterprise');
    assert.ok(enterprisePkg, 'Expected enterprise package to be seeded');

    // 2. Provision Company A (Enterprise plan)
    const uniqA = `compA${Date.now()}${Math.floor(Math.random()*1000)}`;
    const emailA = `${uniqA}@example.test`;
    const pwA = 'Password123!';
    const compARes = await fetchJson('/api/super-admin/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({
        name: `Company A ${uniqA}`,
        contact_name: 'Admin A',
        contact_email: emailA,
        contact_phone: '+919999900001',
        password: pwA,
        package_id: enterprisePkg.id
      })
    });
    assert.equal(compARes.status, 201, 'Company A creation failed');
    const companyAId = compARes.body.id;

    // Activate Company A
    await fetchJson(`/api/super-admin/companies/${companyAId}/toggle-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({ status: 'active' })
    });

    // Login Company A
    const loginARes = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: pwA })
    });
    assert.equal(loginARes.status, 200, 'Login A failed');
    const tokenA = loginARes.body.access_token;

    // 3. Provision Company B (Enterprise plan)
    const uniqB = `compB${Date.now()}${Math.floor(Math.random()*1000)}`;
    const emailB = `${uniqB}@example.test`;
    const pwB = 'Password123!';
    const compBRes = await fetchJson('/api/super-admin/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({
        name: `Company B ${uniqB}`,
        contact_name: 'Admin B',
        contact_email: emailB,
        contact_phone: '+919999900002',
        password: pwB,
        package_id: enterprisePkg.id
      })
    });
    assert.equal(compBRes.status, 201, 'Company B creation failed');
    const companyBId = compBRes.body.id;

    // Activate Company B
    await fetchJson(`/api/super-admin/companies/${companyBId}/toggle-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({ status: 'active' })
    });

    // Login Company B
    const loginBRes = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: pwB })
    });
    assert.equal(loginBRes.status, 200, 'Login B failed');
    const tokenB = loginBRes.body.access_token;

    // ── FEATURE 1: Live GDS Supplier Search ──
    const flightSearch = await fetchJson('/api/gds/flights?from=DEL&to=BOM', {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(flightSearch.status, 200, 'Flight search failed');
    assert.ok(flightSearch.body.results.length > 0, 'No flights returned');

    const hotelSearch = await fetchJson('/api/gds/hotels?city=Mumbai', {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(hotelSearch.status, 200, 'Hotel search failed');
    assert.ok(hotelSearch.body.results.length > 0, 'No hotels returned');

    // ── FEATURE 2: B2B Cooperation Network ──
    // Create local fixed departure in Company A
    const depRes = await fetchJson('/api/fixed-departures', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Monsoon Special Departure',
        destination: 'Sikkim',
        start_date: '2026-08-01',
        end_date: '2026-08-05',
        total_seats: 25,
        price_per_person: 19999
      })
    });
    assert.equal(depRes.status, 201, 'Failed to create fixed departure');
    const departureId = depRes.body.id;

    // Share fixed departure to B2B network
    const shareRes = await fetchJson('/api/b2b/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: 'departure',
        id: departureId,
        share: true
      })
    });
    assert.equal(shareRes.status, 200, 'Failed to share fixed departure');

    // Company B lists B2B marketplace, should see Company A's shared departure
    const marketplaceRes = await fetchJson('/api/b2b/marketplace', {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    assert.equal(marketplaceRes.status, 200);
    const sharedDep = marketplaceRes.body.fixedDepartures.find(d => d.id === departureId);
    assert.ok(sharedDep, 'Shared departure not visible in marketplace for Company B');
    assert.equal(sharedDep.company_name, `Company A ${uniqA}`, 'Company name did not match');

    // Company B imports Company A's departure
    const importRes = await fetchJson('/api/b2b/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({
        type: 'departure',
        id: departureId
      })
    });
    assert.equal(importRes.status, 201, 'Import failed');
    const importedId = importRes.body.id;

    // Verify Company B can read its imported departure locally
    const localDepsB = await fetchJson('/api/fixed-departures', {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const foundB = localDepsB.body.find(d => d.id === importedId);
    assert.ok(foundB, 'Imported departure not found in local list');
    assert.equal(foundB.title, '[Imported] Monsoon Special Departure');
    assert.equal(foundB.is_b2b_shared, 0, 'Imported item should not be shared by default');

    // ── FEATURE 3: Visual Flyer Designer ──
    const flyerCreate = await fetchJson('/api/flyers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        title: 'Himalayan Adventure Flyer',
        layout_data: { style: 'standard', zoom: 1 },
        package_id: null
      })
    });
    assert.equal(flyerCreate.status, 201, 'Failed to create flyer');
    const flyerId = flyerCreate.body.id;

    // List flyers
    const flyersList = await fetchJson('/api/flyers', {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.ok(flyersList.body.find(f => f.id === flyerId), 'Created flyer not returned in list');

    // ── FEATURE 4: Reporting Engine ──
    const salesReport = await fetchJson('/api/reports/sales-by-agent', {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(salesReport.status, 200);
    assert.ok(Array.isArray(salesReport.body), 'Report sales by agent is not an array');

    const destReport = await fetchJson('/api/reports/sales-by-destination', {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(destReport.status, 200);

    const leadReport = await fetchJson('/api/reports/lead-sources', {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(leadReport.status, 200);

    const revReport = await fetchJson('/api/reports/monthly-revenue', {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    assert.equal(revReport.status, 200);

  } finally {
    try { server.kill(); } catch (e) {}
  }
}, { timeout: 120000 });
