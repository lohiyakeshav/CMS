const { Pool } = require('pg');
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "postgres",
  database: "claims_management",
  connectionTimeoutMillis: 5000
});

beforeAll(async () => {
  // Run migrations and seeds
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user'
    );
    
    CREATE TABLE IF NOT EXISTS insurance_products (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      coverage_amount NUMERIC,
      premium NUMERIC,
      duration INTEGER,
      is_approved BOOLEAN DEFAULT false
    );
    
    CREATE TABLE IF NOT EXISTS policy_purchases (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      product_id INTEGER REFERENCES insurance_products(id),
      purchase_date DATE,
      valid_until DATE,
      status VARCHAR(50) DEFAULT 'pending'
    );
    
    CREATE TABLE IF NOT EXISTS claims (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      policy_purchase_id INTEGER REFERENCES policy_purchases(id),
      claim_amount NUMERIC,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

afterAll(async () => {
  await pool.end();
}); 