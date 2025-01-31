const request = require("supertest");
const { app } = require("../app");
const pool = require("../db");

describe("Policyholders API", () => {
  let token = "";
  let policyholderId = null;

  beforeAll(async () => {
    await pool.query("DELETE FROM policyholders");

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ name: "Test User", contact: "1111111111", password: "testpass" });

    expect(registerRes.status).toBe(201);
    policyholderId = registerRes.body.id;

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ contact: "1111111111", password: "testpass" });

    expect(loginRes.status).toBe(200);
    token = loginRes.body.token;
  });

  afterAll(async () => {
    await pool.query("TRUNCATE TABLE claims, policies, policyholders RESTART IDENTITY CASCADE");
  });
  

  it("should fetch all policyholders", async () => {
    const res = await request(app)
      .get("/policyholders")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should fetch a specific policyholder", async () => {
    const res = await request(app)
      .get(`/policyholders/${policyholderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", policyholderId);
  });

  it("should update a policyholder", async () => {
    const res = await request(app)
      .put(`/policyholders/${policyholderId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated User" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated User");
  });

  it("should not update a policyholder with invalid ID", async () => {
    const res = await request(app)
      .put("/policyholders/99999")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Invalid User" });

    expect(res.status).toBe(404);
  });

  it("should delete a policyholder", async () => {
    const res = await request(app)
      .delete(`/policyholders/${policyholderId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(204);
  });

  it("should return 401 for unauthorized access", async () => {
    const res = await request(app)
      .get("/policyholders")
      .set("Authorization", "Bearer fakeToken");

    expect(res.status).toBe(401);
  });

  it("should not delete a non-existing policyholder", async () => {
    const res = await request(app)
      .delete("/policyholders/99999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
