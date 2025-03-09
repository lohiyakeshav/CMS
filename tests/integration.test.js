const { app, pool } = require('../app');
const request = require('supertest');
const bcrypt = require('bcryptjs');

// Test data
const adminUser = {
  name: 'Admin User',
  email: 'admin@test.com',
  password: 'adminpass',
  role: 'admin'
};

const regularUser = {
  name: 'Regular User',
  email: 'user@test.com',
  password: 'userpass',
  role: 'user'
};

const testProduct = {
  title: "Test Insurance",
  description: "Test Description",
  coverage_amount: 100000,
  premium: 1000,
  duration: 12
};

let adminToken, userToken, policyId, claimId;

beforeAll(async () => {
  // Clean existing data
  await pool.query('DELETE FROM claims');
  await pool.query('DELETE FROM policy_purchases');
  await pool.query('DELETE FROM insurance_products');
  await pool.query('DELETE FROM users');

  // Create test users
  await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
    [
      adminUser.name,
      adminUser.email,
      await bcrypt.hash(adminUser.password, 10),
      adminUser.role,
      regularUser.name,
      regularUser.email,
      await bcrypt.hash(regularUser.password, 10),
      regularUser.role
    ]
  );

  // Create test product
  const productRes = await pool.query(
    `INSERT INTO insurance_products 
     (title, description, coverage_amount, premium, duration, is_approved)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING id`,
    [testProduct.title, testProduct.description, testProduct.coverage_amount,
     testProduct.premium, testProduct.duration]
  );
  testProduct.id = productRes.rows[0].id;
});

afterAll(async () => {
  // Cleanup in reverse dependency order
  await pool.query('DELETE FROM claims');
  await pool.query('DELETE FROM policy_purchases');
  await pool.query('DELETE FROM insurance_products');
  await pool.query('DELETE FROM users');
});

describe('Authentication Flow', () => {
  test('User login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: regularUser.email, password: regularUser.password });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    userToken = res.body.token;
  });

  test('Admin login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: adminUser.email, password: adminUser.password });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    adminToken = res.body.token;
  });
});

describe('Products API', () => {
  test('GET /products - Get approved products', async () => {
    const res = await request(app).get('/products');
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: testProduct.title,
          is_approved: true
        })
      ])
    );
  });

  test('GET /products/myPolicies - Get user policies', async () => {
    const res = await request(app)
      .get('/products/myPolicies')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});

describe('Claims API', () => {
  test('POST /claims/claimtriggered - Create claim', async () => {
    // First create a policy purchase
    const policyRes = await request(app)
      .post('/policies/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: testProduct.id,
        startDate: '2024-01-01',
        endDate: '2025-01-01'
      });
    
    policyId = policyRes.body.id;

    const res = await request(app)
      .post('/claims/claimtriggered')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        policy_purchase_id: policyId,
        claim_amount: 5000
      });
    
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    claimId = res.body.id;
  });

  test('POST /claims/claimtriggered - Duplicate claim', async () => {
    const res = await request(app)
      .post('/claims/claimtriggered')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        policy_purchase_id: policyId,
        claim_amount: 5000
      });
    
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });
});

describe('Approval Workflows', () => {
  test('PUT /admin/approvePolicy/{id} - Approve policy (admin)', async () => {
    const res = await request(app)
      .put(`/admin/approvePolicy/${policyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: true });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  test('PUT /admin/approveClaim/{id} - Approve claim (admin)', async () => {
    const res = await request(app)
      .put(`/admin/approveClaim/${claimId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ 
        decision: true,
        rejection_reason: null
      });
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  test('PUT /admin/approveClaim/{id} - Unauthorized approval', async () => {
    const res = await request(app)
      .put(`/admin/approveClaim/${claimId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ decision: true });
    
    expect(res.statusCode).toBe(403);
  });

  test('PUT /admin/approveClaim/{id} - Invalid claim ID', async () => {
    const res = await request(app)
      .put('/admin/approveClaim/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: true });
    
    expect(res.statusCode).toBe(404);
  });
}); 