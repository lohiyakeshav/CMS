require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
