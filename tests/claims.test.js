const request = require('supertest');
const { app } = require('../app');

beforeAll(async () => {
  await request(app)
    .post('/policyholders')
    .send({ id: 'PH1', name: 'John Doe', contact: '1234567890' });

  await request(app)
    .post('/policies')
    .send({
      id: 'POL1',
      type: 'health',
      policyholderId: 'PH1',
      amount: 5000,
      startDate: '2024-01-01',
      endDate: '2030-01-01'
    });
});

describe('Claims API', () => {
  it('should create a valid claim', async () => {
    const res = await request(app)
      .post('/claims')
      .send({ id: 'CL1', policyId: 'POL1', amount: 1000 });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
  });

  it('should prevent claims above policy amount', async () => {
    const res = await request(app)
      .post('/claims')
      .send({ id: 'CL2', policyId: 'POL1', amount: 6000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Claim amount (6000) exceeds policy limit (5000)');
  });

  it('should prevent claims on non-existent policies', async () => {
    const res = await request(app)
      .post('/claims')
      .send({ id: 'CL3', policyId: 'INVALID', amount: 1000 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Policy not found');
  });

  it('should enforce valid claim status transitions', async () => {
    await request(app)
      .post('/claims')
      .send({ id: 'CL4', policyId: 'POL1', amount: 1000 });

    const invalidRes = await request(app)
      .put('/claims/CL4')
      .send({ status: 'paid' });

    expect(invalidRes.status).toBe(400);

    const validRes = await request(app)
      .put('/claims/CL4')
      .send({ status: 'approved' });

    expect(validRes.status).toBe(200);
  });

  it('should not allow missing fields when creating a claim', async () => {
    const res = await request(app)
      .post('/claims')
      .send({ id: 'CL5', amount: 1000 }); // Missing policyId

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required fields');
  });

  it('should delete a claim successfully', async () => {
    await request(app)
      .post('/claims')
      .send({ id: 'CL6', policyId: 'POL1', amount: 500 });

    const delRes = await request(app).delete('/claims/CL6');
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get('/claims/CL6');
    expect(getRes.status).toBe(404);
  });
});
