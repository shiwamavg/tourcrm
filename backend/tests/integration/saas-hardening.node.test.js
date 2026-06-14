import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';

const TEST_PORT = process.env.TEST_PORT || 3021;
const base = `http://127.0.0.1:${TEST_PORT}`;

async function fetchJson(path, opts) {
  const r = await fetch(base + path, opts);
  const text = await r.text();
  let body = text;
  try { body = JSON.parse(text); } catch {}
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

import { test } from 'node:test';

test('integration: saas feature gating and rate limiting', async () => {
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

    // 2. Create a Starter company (which doesn't have 'whatsapp' or 'supplier' in its default features)
    const uniq = `tenant${Date.now()}${Math.floor(Math.random()*1000)}`;
    const email = `${uniq}@example.test`;
    const password = 'Test1234!';
    
    // Find Starter package ID
    const packagesResp = await fetchJson('/api/subscription-packages');
    const starterPkg = packagesResp.body.find(p => p.slug === 'starter');
    assert.ok(starterPkg, 'Expected starter package in seed');

    const signupRes = await fetchJson('/api/super-admin/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({
        name: `Starter Co ${uniq}`,
        contact_name: 'Starter Admin',
        contact_email: email,
        contact_phone: '+919999988888',
        password,
        package_id: starterPkg.id
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

    // 3. Login as Starter tenant
    const loginRes = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.equal(loginRes.status, 200, 'Login failed');
    const tenantToken = loginRes.body.access_token;

    // 4. Verify Rate Limiting Headers are present
    const testReq = await fetchJson('/api/subscription-packages', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.equal(testReq.status, 200);
    assert.ok(testReq.headers.has('x-ratelimit-limit'), 'Expected X-RateLimit-Limit header');
    assert.ok(testReq.headers.has('x-ratelimit-remaining'), 'Expected X-RateLimit-Remaining header');
    assert.ok(testReq.headers.has('x-ratelimit-reset'), 'Expected X-RateLimit-Reset header');

    // 5. Test Feature Gate block for premium route: WhatsApp Config (not in starter plan)
    const waRes = await fetchJson('/api/whatsapp/config', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.equal(waRes.status, 403, 'Expected 403 Forbidden for locked features');
    assert.equal(waRes.body.error, 'Feature locked');
    assert.equal(waRes.body.feature, 'whatsapp');

    // 6. Test Feature Gate block for premium route: Suppliers (not in starter plan)
    const supplierRes = await fetchJson('/api/suppliers', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tenantToken}` }
    });
    assert.equal(supplierRes.status, 403, 'Expected 403 Forbidden for locked features');
    assert.equal(supplierRes.body.error, 'Feature locked');
    assert.equal(supplierRes.body.feature, 'supplier');

  } finally {
    try { server.kill(); } catch (e) {}
  }
}, { timeout: 120000 });
