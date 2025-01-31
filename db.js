require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates (required for cloud-hosted databases)
  },
  max: 10, // Prevent connection overload
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Prevent infinite waiting
});

// Ensure the pool is closed after tests
if (process.env.NODE_ENV === "test") {
  afterAll(async () => {
    await pool.end();
  });
}

module.exports = pool;
