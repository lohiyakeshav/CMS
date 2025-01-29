const request = require('supertest');
const { app } = require('../app');

describe('Policyholders API', () => {
  it('should create a policyholder', async () => {
    const res = await request(app)
      .post('/policyholders')
      .send({ id: 'PH3', name: 'Charlie', contact: '5555555555' });

    expect(res.status).toBe(201);
  });

  it('should not allow duplicate policyholder IDs', async () => {
    await request(app)
      .post('/policyholders')
      .send({ id: 'PH4', name: 'Dave', contact: '4444444444' });

    const res = await request(app)
      .post('/policyholders')
      .send({ id: 'PH4', name: 'Dave Duplicate' });

    expect(res.status).toBe(409);
  });

  it('should delete a policyholder and associated policies', async () => {
    await request(app)
      .post('/policyholders')
      .send({ id: 'PH5', name: 'Eve', contact: '6666666666' });

    await request(app)
      .post('/policies')
      .send({
        id: 'POL6',
        type: 'life',
        policyholderId: 'PH5',
        amount: 4000,
        startDate: '2025-01-01',
        endDate: '2030-01-01'
      });

    const delRes = await request(app).delete('/policyholders/PH5');
    expect(delRes.status).toBe(204);

    const policiesRes = await request(app).get('/policies/POL6');
    expect(policiesRes.status).toBe(200);
  });

  it('should return 404 for non-existent policyholder', async () => {
    const res = await request(app).get('/policyholders/UNKNOWN');
    expect(res.status).toBe(404);
  });
});
