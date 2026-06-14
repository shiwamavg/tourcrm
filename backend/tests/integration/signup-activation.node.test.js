import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';

const TEST_PORT = process.env.TEST_PORT || 3001;
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

async function runSignupFlow() {
  const uniq = `tenant${Date.now()}${Math.floor(Math.random()*1000)}`;
  const company = `AutoCompany ${uniq}`;
  const email = `${uniq}@example.test`;
  const password = 'Test1234!';

  const packagesResp = await fetchJson('/api/subscription-packages');
  assert.equal(packagesResp.status, 200, 'Package catalog failed: ' + JSON.stringify(packagesResp.body));
  assert.ok(Array.isArray(packagesResp.body) && packagesResp.body.length > 0, 'Expected public packages');
  const defaultPackage = packagesResp.body[0];

  let res = await fetchJson('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name: company, contact_name: 'Admin User', contact_email: email, contact_phone: '+911234567890', password })
  });
  assert.equal(res.status, 201, 'Signup failed: ' + JSON.stringify(res.body));
  assert.equal(res.body.status, 'pending');
  assert.equal(res.body.package_id, defaultPackage.id, 'Default public package should be assigned');
  assert.equal(res.body.verification_email_sent, true);
  assert.ok(typeof res.body.dev_otp === 'string', 'Signup should return dev OTP in test mode');
  const companyId = res.body.id;

  res = await fetchJson('/api/auth/signup/resend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  assert.equal(res.status, 200, 'Resend OTP failed: ' + JSON.stringify(res.body));
  assert.equal(res.body.ok, true);
  assert.ok(typeof res.body.dev_otp === 'string', 'Resend should return dev OTP in test mode');

  res = await fetchJson('/api/auth/signup/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code: res.body.dev_otp })
  });
  assert.equal(res.status, 200, 'Signup OTP verification failed: ' + JSON.stringify(res.body));
  assert.equal(res.body.ok, true);
  assert.equal(res.body.email, email);

  res = await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(res.status, 200, 'Self-service activated company should login successfully');
  assert.ok(typeof res.body.access_token === 'string');

  return { companyId, email, password };
}

async function approveCompany(saToken, companyId) {
  const r = await fetchJson(`/api/super-admin/companies/${companyId}/toggle-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + saToken },
    body: JSON.stringify({ status: 'active' })
  });
  assert.equal(r.status, 200, 'Approve company failed: ' + JSON.stringify(r.body));
}

async function loginTenant(email, password) {
  const r = await fetchJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(r.status, 200, 'Tenant login failed after activation: ' + JSON.stringify(r.body));
  return r.body.access_token;
}

import { test } from 'node:test';

test('signup-to-activation SaaS flow', async () => {
  const server = spawn('node', ['src/server.js'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', PORT: TEST_PORT } });
  server.stdout?.on('data', () => {});
  server.stderr?.on('data', () => {});

  try {
    await waitForServer(20000);

    const saResponse = await fetchJson('/api/super-admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'superadmin@tourcrm.local', password: 'SuperAdmin@123' })
    });
    assert.equal(saResponse.status, 200, 'Super-admin login failed: ' + JSON.stringify(saResponse.body));
    const saToken = saResponse.body.access_token;

    const signupResult = await runSignupFlow();
    
    // Suspend company to test super-admin lifecycle
    const suspendRes = await fetchJson(`/api/super-admin/companies/${signupResult.companyId}/toggle-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + saToken },
      body: JSON.stringify({ status: 'suspended' })
    });
    assert.equal(suspendRes.status, 200, 'Suspend company failed');

    // Verify suspended login fails
    const loginFail = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupResult.email, password: signupResult.password })
    });
    assert.equal(loginFail.status, 403, 'Suspended login should be blocked');
    assert.equal(loginFail.body.error, 'Your company account has been suspended. Please contact support.');

    // Reactivate and check login succeeds again
    await approveCompany(saToken, signupResult.companyId);
    await loginTenant(signupResult.email, signupResult.password);
  } finally {
    try { server.kill(); } catch (e) {}
  }
}, { timeout: 120000 });
