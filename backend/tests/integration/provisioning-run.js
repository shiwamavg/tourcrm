(async ()=>{
  const base = 'http://localhost:3000';
  const fetchFn = globalThis.fetch || require('node-fetch');
  function unique(name){return `${name}-${Date.now()}-${Math.floor(Math.random()*1000)}`}
  try{
    // Super-admin login
    let r = await fetchFn(base + '/api/super-admin/login', {method:'POST',headers:{'Content-Type':'application/json'}, body: JSON.stringify({email:'superadmin@tourcrm.local', password: 'SuperAdmin@123'})});
    if (!r.ok) { console.error('Super-admin login failed', await r.text()); process.exit(2); }
    const sa = await r.json(); const saToken = sa.access_token; console.log('SA login OK');

    // Company A
    const nameA = unique('AutoTenantA'); const emailA = `${nameA.replace(/[^a-z0-9]/gi,'').toLowerCase()}@example.test`; const pwA = 'TenantA!234';
    r = await fetchFn(base + '/api/super-admin/companies', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({name: nameA, contact_name:'Admin A', contact_email: emailA, contact_phone:'+911111111111', password: pwA})});
    if (!r.ok){ console.error('Create company A failed', await r.text()); process.exit(3); }
    const companyA = await r.json(); console.log('Created company A id', companyA.id);

    await fetchFn(base + `/api/super-admin/companies/${companyA.id}/toggle-status`, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({status:'active'})});
    console.log('Activated company A');

    r = await fetchFn(base + '/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email: emailA, password: pwA})});
    if (!r.ok){ console.error('Login admin A failed', await r.text()); process.exit(4); }
    const adminA = await r.json(); const tokenA = adminA.access_token; console.log('Admin A login OK');

    // Create lead in A
    r = await fetchFn(base + '/api/leads', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+tokenA}, body: JSON.stringify({full_name:'Lead from A', phone:'+919999900001', email:`leada${companyA.id}@example.test`, destination_text:'X'})});
    if (!r.ok){ console.error('Create lead A failed', await r.text()); process.exit(5); }
    const leadA = await r.json(); console.log('Lead A created id', leadA.id);

    // Company B
    const nameB = unique('AutoTenantB'); const emailB = `${nameB.replace(/[^a-z0-9]/gi,'').toLowerCase()}@example.test`; const pwB = 'TenantB!234';
    r = await fetchFn(base + '/api/super-admin/companies', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({name: nameB, contact_name:'Admin B', contact_email: emailB, contact_phone:'+911222222222', password: pwB})});
    if (!r.ok){ console.error('Create company B failed', await r.text()); process.exit(6); }
    const companyB = await r.json(); console.log('Created company B id', companyB.id);

    await fetchFn(base + `/api/super-admin/companies/${companyB.id}/toggle-status`, {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+saToken}, body: JSON.stringify({status:'active'})});
    console.log('Activated company B');

    r = await fetchFn(base + '/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email: emailB, password: pwB})});
    if (!r.ok){ console.error('Login admin B failed', await r.text()); process.exit(7); }
    const adminB = await r.json(); const tokenB = adminB.access_token; console.log('Admin B login OK');

    // B tries to fetch A's lead
    r = await fetchFn(base + `/api/leads/${leadA.id}`, {method:'GET', headers:{'Authorization':'Bearer '+tokenB}});
    const text = await r.text();
    if (r.status === 404) { console.log('Isolation enforced: B cannot access A lead -> 404'); process.exit(0); }
    else { console.error('Isolation failure, status', r.status, text); process.exit(8); }

  } catch (e) { console.error('Error', e); process.exit(99); }
})();
