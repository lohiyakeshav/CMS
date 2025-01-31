const request = require("supertest");
const { app } = require("../app");
const pool = require("../db");

describe("Claims API", () => {
  let token = "";
  let policyId = null;

  beforeAll(async () => {
    await pool.query("DELETE FROM claims");
    await pool.query("DELETE FROM policies");
    await pool.query("DELETE FROM policyholders");

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ name: "Claim Tester", contact: "2222222222", password: "testpass" });

    expect(registerRes.status).toBe(201);
    const policyholderId = registerRes.body.id;

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ contact: "2222222222", password: "testpass" });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;

    console.log("Creating policy for policyholder:", policyholderId);
    const policyRes = await request(app)
      .post("/policies")
      .set("Authorization", `Bearer ${token}`)
      .send({
        id: "policy-001",
        type: "health",
        amount: 5000,
        startDate: "2024-01-01",
        endDate: "2030-01-01",
        policyholderId: policyholderId,
      });
    expect(policyRes.status).toBe(201);
    console.log("Policy Created:", policyRes.body);
    policyId = policyRes.body.id;
    
  });

  afterAll(async () => {
    await pool.query("TRUNCATE TABLE claims, policies, policyholders RESTART IDENTITY CASCADE");
  });
  

  it("should create a new claim", async () => {
    const res = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${token}`)
      .send({ policyId, amount: 500, description: "Medical Expense" });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("status", "pending");
  });

  // More test cases
  it("should return 404 for a non-existing claim", async () => {
    const res = await request(app)
      .get("/claims/999")
      
      .set("Authorization", `Bearer ${token}`);
      console.log("Token being sent:", token);

    expect(res.status).toBe(404);
  });

  it("should return 400 when creating a claim with excessive amount", async () => {
    const res = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${token}`)
      .send({ policyId, amount: 6000, description: "Too much" });

    expect(res.status).toBe(400);
  });

  it("should return 200 and claim details when fetching a valid claim", async () => {
    const createRes = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${token}`)
      .send({ policyId, amount: 500, description: "Medical Expense" });

    const claimId = createRes.body.id;
    const res = await request(app)
      .get(`/claims/${policyId}`)
      .set("Authorization", `Bearer ${token}`);
      console.log("Token being sent:", token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("policy_id", policyId);
  });

  it("should update a claim status successfully", async () => {
    const res = await request(app)
      .put(`/claims/${policyId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "approved" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "approved");
  });

  it("should return 403 when creating a claim with an invalid token", async () => {
    const res = await request(app)
        .post("/claims")
        .set("Authorization", "Bearer invalidtoken")
        .send({ policyId, amount: 500, description: "Test claim" });

    expect(res.status).toBe(401);
});

it("should return 400 when creating a claim with a missing amount", async () => {
    const res = await request(app)
        .post("/claims")
        .set("Authorization", `Bearer ${token}`)
        .send({ policyId, description: "Medical Expense" });

    expect(res.status).toBe(400);
});

it("should return 400 when creating a claim with a missing policyId", async () => {
    const res = await request(app)
        .post("/claims")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 500, description: "Medical Expense" });

    expect(res.status).toBe(400);
});

it("should return 404 when updating a non-existing claim", async () => {
    const res = await request(app)
        .put("/claims/9999")
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "approved" });

    expect(res.status).toBe(404);
});


  it("should return 204 on successful claim deletion", async () => {
    const res = await request(app)
      .delete(`/claims/${policyId}`)
      
      .set("Authorization", `Bearer ${token}`);
      console.log("Token being sent:", token);

    expect(res.status).toBe(204);
  });
});
