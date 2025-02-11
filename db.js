require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates (required for cloud-hosted databases)
  },
  max: 20, // Increase the maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Increase the idle timeout to 30 seconds
  connectionTimeoutMillis: 10000, // Increase the connection timeout to 10 seconds
});

// Ensure the pool is closed after tests
if (process.env.NODE_ENV === "test") {
  afterAll(async () => {
    await pool.end();
  });
}

module.exports = pool;
