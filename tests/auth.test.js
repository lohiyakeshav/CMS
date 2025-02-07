const request = require("supertest");
const jwt = require('jsonwebtoken');
const { app } = require("../app");
const pool = require("../db");

describe("Auth API", () => {
  let token = "";

  const getFreshToken = async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ contact: "1234567890", password: "password123" });
    return loginRes.body.token;
  };

  beforeAll(async () => {
    await pool.query("DELETE FROM policyholders");

    // Register policyholder
    const registerRes = await request(app)
      .post("/auth/register")
      .send({ name: "John Doe", contact: "1234567890", password: "password123" });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toHaveProperty("id");

    // Get fresh token
    token = await getFreshToken();
  });

  beforeEach(async () => {
    // Refresh token before each test
    token = await getFreshToken();
  });

  afterAll(async () => {
    await pool.query("TRUNCATE TABLE claims, policies, policyholders RESTART IDENTITY CASCADE");
  });

  it("should return 401 when using an expired token", async () => {
    // Generate valid test token
    const validToken = jwt.sign(
      { policyholderId: 1 }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // 1 hour validity
    );

    // Generate properly expired token
    const expiredToken = jwt.sign(
      { policyholderId: 1 }, 
      process.env.JWT_SECRET,
      { expiresIn: 0 } // Immediately expired
    );

    const res = await request(app)
      .get("/policyholders/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Token expired/i); // Flexible matching
  });

  it("should return 404 when fetching self-profile if user does not exist", async () => {
    // First delete the user
    await pool.query('DELETE FROM policyholders WHERE id = 1');
    
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});