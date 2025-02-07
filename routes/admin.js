const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const adminCheck = require('../middleware/adminMiddleware');

// Admin: Get all policyholders
router.get('/policyholders', authenticateToken, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, created_at 
       FROM policyholders 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve policyholders' });
  }
});

// Get all insurance products (including unapproved)
router.get('/products', authenticateToken, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insurance_products'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get pending approvals
router.get('/products/pending', authenticateToken, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ip.*, ph.name as submitter_name
       FROM insurance_products ip
       JOIN policyholders ph ON ip.created_by = ph.id
       WHERE ip.is_approved = false`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve pending products' });
  }
});

// Admin: Approve insurance product
router.post('/products/approve/:id', authenticateToken, adminCheck, async (req, res) => {
  try {
    const { decision, reason } = req.body;
    
    await pool.query('BEGIN');
    
    // Update product approval status
    await pool.query(
      `UPDATE insurance_products 
       SET is_approved = $1 
       WHERE id = $2`,
      [decision, req.params.id]
    );
    
    // Record approval decision
    await pool.query(
      `INSERT INTO approvals 
       (product_id, admin_id, decision, reason) 
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, req.policyholder.id, decision, reason]
    );
    
    await pool.query('COMMIT');
    res.json({ 
      message: `Product ${decision ? 'approved' : 'rejected'}`,
      productId: req.params.id
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: 'Approval process failed' });
  }
});

// Get all transactions
router.get('/transactions', authenticateToken, adminCheck, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name as user_name, i.title as product_title
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN insurance_products i ON t.product_id = i.id
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 