const request = require("supertest");
const { app } = require("../app");
const pool = require("../db");



describe("Policies API", () => {
  let token = "";
  let policyId = null;
  let policyholderId = null;
  const getFreshToken = async () => {
    const loginRes = await request(app)
      .post("/auth/login")
      .send({ contact: "3333333333", password: "testpass" });
    return loginRes.body.token;
  };
  

  beforeAll(async () => {
    await pool.query("TRUNCATE TABLE claims, policies, policyholders RESTART IDENTITY CASCADE");

    // Register & login policyholder
    const registerRes = await request(app)
      .post("/auth/register")
      .send({ name: "Policy Tester", contact: "3333333333", password: "testpass" });

    expect(registerRes.status).toBe(201);
    policyholderId = registerRes.body.id;

    token = await getFreshToken();

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ contact: "3333333333", password: "testpass" });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;

    // Create policy
    const policyRes = await request(app)
      .post("/policies")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "health",
        amount: 5000,
        startDate: "2024-01-01",
        endDate: "2030-01-01",
        policyholderId,
      });

    console.log("Policy Response:", policyRes.body);
    expect(policyRes.status).toBe(201);
    policyId = policyRes.body.id;
  });

  beforeEach(async () => {
    // Refresh token before each test
    token = await getFreshToken();
  });

  afterAll(async () => {
    await pool.query("TRUNCATE TABLE claims, policies, policyholders RESTART IDENTITY CASCADE");
  });

  it("should fetch all policies", async () => {
    const res = await request(app)
      .get("/policies")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should fetch a specific policy", async () => {
    const res = await request(app)
      .get(`/policies/${policyId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", policyId);
  });

  it("should not fetch a non-existing policy", async () => {
    const res = await request(app)
      .get("/policies/99999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("should delete a policy", async () => {
    const res = await request(app)
      .delete(`/policies/${policyId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("should return 404 when deleting a non-existent policy", async () => {
    const res = await request(app)
      .delete("/policies/99999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
  it("should return 400 when creating a policy with a missing type", async () => {
    const res = await request(app)
        .post("/policies")
        .set("Authorization", `Bearer ${token}`)
        .send({ amount: 5000, policyholderId, startDate: "2024-01-01", endDate: "2030-01-01" });

    expect(res.status).toBe(400);
});

it("should return 400 when creating a policy with an invalid date", async () => {
    const res = await request(app)
        .post("/policies")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "auto", amount: 5000, policyholderId, startDate: "invalid-date", endDate: "2030-01-01" });

    expect(res.status).toBe(400);
});

});
