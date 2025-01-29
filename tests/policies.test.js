const request = require('supertest');
const { app } = require('../app');

beforeAll(async () => {
  await request(app)
    .post('/policyholders')
    .send({ id: 'PH2', name: 'Alice Doe', contact: '9876543210' });
});

describe('Policies API', () => {
  it('should create a policy with valid data', async () => {
    const res = await request(app)
      .post('/policies')
      .send({
        id: 'POL2',
        type: 'auto',
        policyholderId: 'PH2',
        amount: 3000,
        startDate: '2024-02-01',
        endDate: '2026-02-01'
      });

    expect(res.status).toBe(201);
  });

  it('should prevent policy creation without required fields', async () => {
    const res = await request(app)
      .post('/policies')
      .send({
        id: 'POL3',
        type: 'auto',
        amount: 3000, // Missing policyholderId, startDate
      });

    expect(res.status).toBe(400);
  });

  it('should not allow past end dates', async () => {
    const res = await request(app)
      .post('/policies')
      .send({
        id: 'POL4',
        type: 'auto',
        policyholderId: 'PH2',
        amount: 2000,
        startDate: '2018-01-01',
        endDate: '2019-01-01'
      });

    expect(res.status).toBe(400);
  });

  it('should delete a policy', async () => {
    await request(app)
      .post('/policies')
      .send({
        id: 'POL5',
        type: 'life',
        policyholderId: 'PH2',
        amount: 4000,
        startDate: '2025-01-01',
        endDate: '2030-01-01'
      });

    const delRes = await request(app).delete('/policies/POL5');
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get('/policies/POL5');
    expect(getRes.status).toBe(404);
  });
});
