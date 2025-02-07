const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get all approved products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, coverage_amount, premium, duration
       FROM insurance_products 
       WHERE is_approved = true`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// Submit new product (policyholder)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, coverage_amount, premium, duration } = req.body;
    
    const result = await pool.query(
      `INSERT INTO insurance_products 
       (title, description, coverage_amount, premium, duration, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, coverage_amount, premium, duration`,
      [title, description, coverage_amount, premium, duration, req.policyholder.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Product submission failed' });
  }
}); 