import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';
import { test } from 'node:test';

const TEST_PORT = process.env.TEST_PORT || 3027;
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

test('integration: packages dynamic seat limits, surge pricing, and referrals', async () => {
  const server = spawn('node', ['src/server.js'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test', PORT: TEST_PORT } });
  server.stdout?.on('data', (d) => console.log('[Server STDOUT]', d.toString()));
  server.stderr?.on('data', (d) => console.error('[Server STDERR]', d.toString()));

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

    // Get Enterprise subscription package
    const pkgsRes = await fetchJson('/api/subscription-packages');
    const enterprisePkg = pkgsRes.body.find(p => p.slug === 'enterprise');
    assert.ok(enterprisePkg, 'Expected enterprise package to be seeded');

    // 2. Provision Company
    const uniq = `surgeCo${Date.now()}${Math.floor(Math.random()*1000)}`;
    const email = `${uniq}@example.test`;
    const pw = 'Password123!';
    const compRes = await fetchJson('/api/super-admin/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({
        name: `Surge Agency ${uniq}`,
        contact_name: 'Surge Manager',
        contact_email: email,
        contact_phone: '+919999911155',
        password: pw,
        package_id: enterprisePkg.id
      })
    });
    assert.equal(compRes.status, 201, 'Company creation failed');
    const companyId = compRes.body.id;

    // Activate Company
    await fetchJson(`/api/super-admin/companies/${companyId}/toggle-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({ status: 'active' })
    });

    // Login Company Admin
    const loginRes = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pw })
    });
    assert.equal(loginRes.status, 200, 'Login failed');
    const token = loginRes.body.access_token;

    // 3. CRM Admin - Create Predefined Package with seat limits, surge rules, and referral commission
    const createRes = await fetchJson('/api/packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Group Tour Bus Package',
        category: 'Bus Tour',
        price: 10000,
        duration_days: 3,
        duration_nights: 2,
        description: 'Cheap and best package in a 5-seater luxury van',
        max_participants: 5,
        price_surge_type: 'fixed',
        price_surge_threshold: 2,
        price_surge_amount: 2000,
        referral_commission_type: 'percentage',
        referral_commission_rate: 10
      })
    });
    assert.equal(createRes.status, 201, 'Failed to create predefined package');
    const packageId = createRes.body.id;
    assert.equal(createRes.body.max_participants, 5);
    assert.equal(createRes.body.price_surge_type, 'fixed');
    assert.equal(createRes.body.price_surge_threshold, 2);
    assert.equal(createRes.body.price_surge_amount, 2000);

    // 4. Verify Initial Public Package Pricing & Seats Remaining
    const listPublicRes1 = await fetchJson(`/api/packages?company_id=${companyId}`);
    assert.equal(listPublicRes1.status, 200);
    const pubPkg1 = listPublicRes1.body.find(p => p.id === packageId);
    assert.ok(pubPkg1, 'Package not found in public listing');
    assert.equal(pubPkg1.price, 10000);
    assert.equal(pubPkg1.current_price, 10000, 'Price should not surge initially');
    assert.equal(pubPkg1.remaining_seats, 5);

    // 5. Public Visitor - Book first 2 seats (Referrer booking)
    const bookRes1 = await fetchJson(`/api/packages/${packageId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Referrer Bob',
        email: 'bob@referrer.test',
        phone: '+919999900011',
        travel_date: '2026-08-10',
        travellers: 2,
        notes: 'Need window seats.'
      })
    });
    assert.equal(bookRes1.status, 201);
    const leadId1 = bookRes1.body.lead_id;

    // Admin converts Lead 1 to Quotation 1
    const convRes1 = await fetchJson(`/api/leads/${leadId1}/convert`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(convRes1.status, 201);
    const qId1 = convRes1.body.quotation_id;

    // Admin updates Quotation 1 price to 20000 via PUT
    const qUpdateRes1 = await fetchJson(`/api/quotations/${qId1}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_name: 'Referrer Bob',
        customer_phone: '+919999900011',
        trip_start_date: '2026-08-10',
        trip_end_date: '2026-08-13',
        package_type: 'hotel_car',
        destination_text: 'Group Tour Bus Package',
        package_id: packageId,
        adults: 2,
        misc: [{ label: 'Tour Fee', amount: 20000 }]
      })
    });
    assert.equal(qUpdateRes1.status, 200);

    // Admin creates Booking 1 from Quotation 1
    const bkgRes1 = await fetchJson('/api/admin/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quotation_id: qId1 })
    });
    assert.equal(bkgRes1.status, 201);
    const bookingId1 = bkgRes1.body.id;
    const bookingNumber1 = bkgRes1.body.booking_number;

    // 6. Verify Public Seats Remaining drops to 3, price is still normal
    const listPublicRes2 = await fetchJson(`/api/packages?company_id=${companyId}`);
    const pubPkg2 = listPublicRes2.body.find(p => p.id === packageId);
    assert.equal(pubPkg2.remaining_seats, 3);
    assert.equal(pubPkg2.current_price, 10000);

    // 7. Public Visitor - Book another 2 seats with referral of booking 1
    const bookRes2 = await fetchJson(`/api/packages/${packageId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Friend Alice',
        email: 'alice@friend.test',
        phone: '+919999900022',
        travel_date: '2026-08-10',
        travellers: 2,
        notes: 'Friend of Bob.',
        ref_booking: bookingNumber1
      })
    });
    assert.equal(bookRes2.status, 201);
    const leadId2 = bookRes2.body.lead_id;

    // Admin converts Lead 2 to Quotation 2
    const convRes2 = await fetchJson(`/api/leads/${leadId2}/convert`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(convRes2.status, 201);
    const qId2 = convRes2.body.quotation_id;

    // Admin updates Quotation 2 price to 20000 via PUT
    const qUpdateRes2 = await fetchJson(`/api/quotations/${qId2}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        customer_name: 'Friend Alice',
        customer_phone: '+919999900022',
        trip_start_date: '2026-08-10',
        trip_end_date: '2026-08-13',
        package_type: 'hotel_car',
        destination_text: 'Group Tour Bus Package',
        package_id: packageId,
        adults: 2,
        misc: [{ label: 'Tour Fee', amount: 20000 }]
      })
    });
    assert.equal(qUpdateRes2.status, 200);

    // Admin creates Booking 2 from Quotation 2 (generates commission for Bob)
    const bkgRes2 = await fetchJson('/api/admin/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quotation_id: qId2 })
    });
    assert.equal(bkgRes2.status, 201);

    // 8. Verify Remaining seats is 1, and price is surged because 1 <= threshold 2
    const listPublicRes3 = await fetchJson(`/api/packages?company_id=${companyId}`);
    const pubPkg3 = listPublicRes3.body.find(p => p.id === packageId);
    assert.equal(pubPkg3.remaining_seats, 1);
    assert.equal(pubPkg3.current_price, 12000, 'Price should be surged by 2000');

    // 9. Public Visitor - Booking 2 seats should be rejected because only 1 remains
    const bookResFail = await fetchJson(`/api/packages/${packageId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Failed Booker',
        email: 'fail@fail.test',
        phone: '+919999900033',
        travellers: 2
      })
    });
    assert.equal(bookResFail.status, 400);
    assert.ok(bookResFail.body.error.includes('Not enough seats'), 'Expected seat limit rejection');

    // 10. Book exactly 1 remaining seat (should succeed)
    const bookResSucceed = await fetchJson(`/api/packages/${packageId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Last Seat Guy',
        email: 'last@seat.test',
        phone: '+919999900044',
        travellers: 1
      })
    });
    assert.equal(bookResSucceed.status, 201);

    // 11. Admin list commissions and verify Bob's referral commission exists
    const commsRes = await fetchJson('/api/admin/commissions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(commsRes.status, 200);
    const bobsComm = commsRes.body.items.find(c => c.referrer_booking_id === bookingId1);
    assert.ok(bobsComm, 'Bob should have earned a referral commission');
    // Grand total of Alice's quotation was 23100 (20000 + 10% markup + 5% GST on subtotal + markup)
    // 10% referral commission = 2310
    assert.equal(bobsComm.amount, 2310);
    assert.equal(bobsComm.status, 'pending');

  } finally {
    try { server.kill(); } catch (e) {}
  }
}, { timeout: 120000 });
