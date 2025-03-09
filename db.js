require("dotenv").config();
const { Pool } = require("pg");

const poolConfig = {
  connectionString: process.env.NODE_ENV === 'test' 
    ? process.env.DATABASE_URL_LOCAL 
    : process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'test' 
    ? false 
    : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
};

const pool = new Pool(poolConfig);

// Test connection on startup
pool.query('SELECT NOW()')
  .then(() => console.log(`Connected to ${process.env.NODE_ENV || 'production'} database`))
  .catch(err => console.error('Database connection failed:', err));

// Cleanup for tests
if (process.env.NODE_ENV === "test") {
  afterAll(async () => {
    await pool.end();
  });
}

module.exports = pool;
