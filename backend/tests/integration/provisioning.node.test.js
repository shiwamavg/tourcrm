import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';

const TEST_PORT = process.env.TEST_PORT || 3011;
const base = `http://127.0.0.1:${TEST_PORT}`;

async function fetchJson(path, opts){
  const r = await fetch(base + path, opts);
  const text = await r.text();
  let body = text;
  try{ body = JSON.parse(text); } catch(e){}
  return {status: r.status, body};
}

async function waitForServer(timeout=20000){
  const start = Date.now();
  while (Date.now() - start < timeout){
    try{
      const r = await fetch(base + '/api/health');
      if (r.ok) return;
    }catch(e){}
    await wait(500);
  }
  throw new Error('Server did not become ready in time');
}

async function runProvisioningFlow(){
  // Super-admin login
  let res = await fetchJson('/api/super-admin/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'superadmin@tourcrm.local', password: 'SuperAdmin@123'})});
  assert.equal(res.status, 200, 'Super-admin login failed: ' + JSON.stringify(res.body));
  const saToken = res.body.access_token;

  // Company A
  const uniq = `auto${Date.now()}${Math.floor(Math.random()*1000)}`;
  const nameA = `AutoTenantA-${uniq}`; const emailA = `${uniq}@example.test`; const pwA = 'TenantA!234';
  res = await fetchJson('/api/super-admin/companies', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({name: nameA, contact_name:'Admin A', contact_email: emailA, contact_phone:'+911111111111', password: pwA})});
  assert.ok(res.status >= 200 && res.status < 300, 'Create company A failed: ' + JSON.stringify(res.body));
  const companyA = res.body;

  await fetchJson(`/api/super-admin/companies/${companyA.id}/toggle-status`, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({status:'active'})});

  res = await fetchJson('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email: emailA, password: pwA})});
  assert.ok(res.status >= 200 && res.status < 300, 'Login admin A failed: ' + JSON.stringify(res.body));
  const tokenA = res.body.access_token;

  // Create lead in A
  res = await fetchJson('/api/leads', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+tokenA}, body: JSON.stringify({full_name:'Lead from A', phone:'+919999900001', email:`leada${companyA.id}@example.test`, destination_text:'X'})});
  assert.ok(res.status >= 200 && res.status < 300, 'Create lead A failed: ' + JSON.stringify(res.body));
  const leadA = res.body;

  // Company B
  const nameB = `AutoTenantB-${uniq}`; const emailB = `${uniq}b@example.test`; const pwB = 'TenantB!234';
  res = await fetchJson('/api/super-admin/companies', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({name: nameB, contact_name:'Admin B', contact_email: emailB, contact_phone:'+911222222222', password: pwB})});
  assert.ok(res.status >= 200 && res.status < 300, 'Create company B failed: ' + JSON.stringify(res.body));
  const companyB = res.body;

  await fetchJson(`/api/super-admin/companies/${companyB.id}/toggle-status`, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({status:'active'})});

  res = await fetchJson('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email: emailB, password: pwB})});
  assert.ok(res.status >= 200 && res.status < 300, 'Login admin B failed: ' + JSON.stringify(res.body));
  const tokenB = res.body.access_token;

  // B tries to fetch A's lead
  res = await fetchJson(`/api/leads/${leadA.id}`, {method:'GET', headers:{'Authorization':'Bearer '+tokenB}});
  assert.equal(res.status, 404, 'Isolation not enforced, status: ' + res.status + ' body: ' + JSON.stringify(res.body));
}

// Single test using Node's native test runner
import { test } from 'node:test';

test('integration: provisioning and tenant isolation', async (t) => {
  // start server
  const server = spawn('node', ['src/server.js'], {cwd: process.cwd(), env: {...process.env, NODE_ENV:'test', PORT: TEST_PORT}});
  server.stdout?.on('data', d => {});
  server.stderr?.on('data', d => {});

  try{
    await waitForServer(20000);
    await runProvisioningFlow();
  } finally {
    try{ server.kill(); } catch(e){}
  }
}, {timeout: 120_000});
