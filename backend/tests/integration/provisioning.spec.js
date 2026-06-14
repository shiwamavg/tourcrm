const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app');

function unique(name) {
  return `${name}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
}

describe('SaaS provisioning and isolation', function() {
  this.timeout(20000);

  let saToken;

  before(async () => {
    // Login as super-admin
    const res = await request(app)
      .post('/api/super-admin/login')
      .send({ email: 'superadmin@tourcrm.local', password: 'SuperAdmin@123' })
      .expect(200);
    saToken = res.body.access_token;
    expect(saToken).to.be.a('string');
  });

  it('provisions two companies and enforces isolation', async () => {
    // Create company A
    const nameA = unique('TestTenantA');
    const emailA = `${nameA.replace(/[^a-z0-9]/gi,'').toLowerCase()}@example.test`;
    const pwA = 'TenantX!23';

    const createA = await request(app)
      .post('/api/super-admin/companies')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: nameA, contact_name: 'Admin A', contact_email: emailA, contact_phone: '+911234567890', password: pwA });
    expect(createA.status).to.equal(201);
    const companyA = createA.body;
    expect(companyA.id).to.be.a('number');

    // Activate
    await request(app)
      .post(`/api/super-admin/companies/${companyA.id}/toggle-status`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ status: 'active' })
      .expect(200);

    // Login as admin A
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: emailA, password: pwA })
      .expect(200);
    const tokenA = loginA.body.access_token;
    expect(tokenA).to.be.a('string');

    // Create a lead under A
    const lead = await request(app)
      .post('/api/leads')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ full_name: 'Lead A1', phone: '+919999000000', email: 'a1@lead.test', destination_text: 'X' })
      .expect(201);
    const leadA = lead.body;
    expect(leadA.company_id).to.equal(companyA.id);

    // Create company B
    const nameB = unique('TestTenantB');
    const emailB = `${nameB.replace(/[^a-z0-9]/gi,'').toLowerCase()}@example.test`;
    const pwB = 'TenantY!23';

    const createB = await request(app)
      .post('/api/super-admin/companies')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: nameB, contact_name: 'Admin B', contact_email: emailB, contact_phone: '+919988776655', password: pwB });
    expect(createB.status).to.equal(201);
    const companyB = createB.body;

    await request(app)
      .post(`/api/super-admin/companies/${companyB.id}/toggle-status`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ status: 'active' })
      .expect(200);

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: emailB, password: pwB })
      .expect(200);
    const tokenB = loginB.body.access_token;

    // B attempts to fetch leadA -> should be 404
    await request(app)
      .get(`/api/leads/${leadA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

  });
});
