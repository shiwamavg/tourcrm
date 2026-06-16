import assert from 'assert';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';
import { test } from 'node:test';

const TEST_PORT = process.env.TEST_PORT || 3026;
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

test('integration: predefined packages module', async () => {
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

    // Get Enterprise package ID
    const pkgsRes = await fetchJson('/api/subscription-packages');
    const enterprisePkg = pkgsRes.body.find(p => p.slug === 'enterprise');
    assert.ok(enterprisePkg, 'Expected enterprise package to be seeded');

    // 2. Provision Company (Enterprise plan so all reports features are active)
    const uniq = `pkgCo${Date.now()}${Math.floor(Math.random()*1000)}`;
    const email = `${uniq}@example.test`;
    const pw = 'Password123!';
    const compRes = await fetchJson('/api/super-admin/companies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${saToken}`
      },
      body: JSON.stringify({
        name: `Package Agency ${uniq}`,
        contact_name: 'Package Manager',
        contact_email: email,
        contact_phone: '+919999900055',
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

    // 3. CRM Admin - Create Predefined Package
    const createRes = await fetchJson('/api/packages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Beautiful Kashmir Escape',
        category: 'Group Tour',
        price: 29999,
        duration_days: 6,
        duration_nights: 5,
        description: 'Explore Srinagar, Gulmarg, and Pahalgam',
        inclusions: '• 3 Star Hotels\n• Breakfast and Dinner',
        exclusions: '• Flights\n• Entry tickets',
        itinerary: [
          { day: 1, title: 'Arrival in Srinagar', description: 'Transfer to houseboat' },
          { day: 2, title: 'Srinagar to Gulmarg', description: 'Sondola ride' }
        ],
        hotels: [
          { hotel_name: 'Hotel Srinagar', room_type: 'Deluxe', meal_plan: 'MAP', num_nights: 3 }
        ],
        cars: [
          { car_type: 'Innova', num_days: 5, notes: 'Sightseeing' }
        ]
      })
    });
    assert.equal(createRes.status, 201, 'Failed to create predefined package');
    const packageId = createRes.body.id;
    assert.equal(createRes.body.title, 'Beautiful Kashmir Escape');
    assert.equal(createRes.body.category, 'Group Tour');

    const returnedHotels = typeof createRes.body.hotels === 'string'
      ? JSON.parse(createRes.body.hotels)
      : createRes.body.hotels;
    assert.equal(returnedHotels[0].hotel_name, 'Hotel Srinagar');

    const returnedCars = typeof createRes.body.cars === 'string'
      ? JSON.parse(createRes.body.cars)
      : createRes.body.cars;
    assert.equal(returnedCars[0].car_type, 'Innova');

    // 4. CRM Admin - Update Predefined Package
    const updateRes = await fetchJson(`/api/packages/${packageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        price: 31999,
        description: 'Updated Kashmir Description'
      })
    });
    assert.equal(updateRes.status, 200, 'Failed to update package');
    assert.equal(updateRes.body.price, 31999);
    assert.equal(updateRes.body.description, 'Updated Kashmir Description');

    // 4b. CRM Admin - Upload Predefined Package Cover Image
    const mockImageBlob = new Blob(['fake-image-bytes'], { type: 'image/png' });
    const fd = new FormData();
    fd.append('image', mockImageBlob, 'test-cover.png');

    const uploadRes = await fetchJson('/api/packages/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: fd
    });
    assert.equal(uploadRes.status, 200, 'Predefined package image upload failed');
    assert.ok(uploadRes.body.url, 'No image URL returned');
    assert.ok(uploadRes.body.url.includes('/uploads/'), 'Image URL does not contain static uploads prefix');

    // 5. CRM Admin - List Predefined Packages (Admin view)
    const listAdminRes = await fetchJson('/api/packages/admin/all', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(listAdminRes.status, 200);
    assert.ok(listAdminRes.body.items.length > 0, 'No admin packages listed');
    const foundAdminPkg = listAdminRes.body.items.find(p => p.id === packageId);
    assert.ok(foundAdminPkg, 'Created package not found in admin list');

    // 6. Public Visitor - List Public Packages
    const listPublicRes = await fetchJson(`/api/packages?company_id=${companyId}`);
    assert.equal(listPublicRes.status, 200);
    assert.ok(listPublicRes.body.length > 0, 'No public packages listed');
    const foundPublicPkg = listPublicRes.body.find(p => p.id === packageId);
    assert.ok(foundPublicPkg, 'Created package not found in public list');
    assert.equal(foundPublicPkg.is_active, 1);

    // 7. Public Visitor - Get Package Detail
    const detailRes = await fetchJson(`/api/packages/${packageId}`);
    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.title, 'Beautiful Kashmir Escape');

    // 8. Public Visitor - Book / Enquire Package
    const bookRes = await fetchJson(`/api/packages/${packageId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'John Doe Test',
        email: 'johndoe@example.test',
        phone: '+919876543210',
        travel_date: '2026-08-01',
        travellers: 2,
        notes: 'Vegetarian meals required.'
      })
    });
    assert.equal(bookRes.status, 201, 'Public package booking failed');
    assert.equal(bookRes.body.ok, true);
    const leadId = bookRes.body.lead_id;
    assert.ok(leadId, 'Lead ID not returned');

    // 9. CRM Admin - Verify Lead exists and is linked to the Predefined Package
    const leadRes = await fetchJson(`/api/leads/${leadId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(leadRes.status, 200);
    assert.equal(leadRes.body.full_name, 'John Doe Test');
    assert.equal(leadRes.body.package_id, packageId, 'Lead not linked to package_id');
    assert.equal(leadRes.body.package_title, 'Beautiful Kashmir Escape', 'Package title was not left joined');

    // 9b. CRM Admin - Convert Lead to Quotation and verify it links package_id
    const convertRes = await fetchJson(`/api/leads/${leadId}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    assert.equal(convertRes.status, 201, 'Lead conversion failed');
    const quotationId = convertRes.body.quotation_id;
    assert.ok(quotationId, 'Quotation ID not returned on convert');

    // Fetch the quotation and check its fields
    const quoteRes = await fetchJson(`/api/quotations/${quotationId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(quoteRes.status, 200);
    assert.equal(quoteRes.body.package_id, packageId, 'Quotation not linked to package_id');
    assert.equal(quoteRes.body.package_title, 'Beautiful Kashmir Escape', 'Quotation package_title not returned');

    // 10. CRM Admin - Verify Package Performance Report
    const perfRes = await fetchJson('/api/reports/package-performance', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(perfRes.status, 200, 'Failed to fetch package performance report');
    assert.ok(Array.isArray(perfRes.body), 'Report should be an array');
    const perfRow = perfRes.body.find(r => r.package_id === packageId);
    assert.ok(perfRow, 'Created package not found in performance report');
    assert.equal(perfRow.leads_count, 1, 'Expected exactly 1 lead counted');
    assert.equal(perfRow.bookings_count, 0, 'Expected 0 bookings');

    // 11. CRM Admin - Delete Predefined Package
    const deleteRes = await fetchJson(`/api/packages/${packageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.ok, true);

  } finally {
    try { server.kill(); } catch (e) {}
  }
}, { timeout: 120000 });
