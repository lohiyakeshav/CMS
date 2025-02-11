const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// Get user transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.transaction_type, t.transaction_date, t.status,
              ip.title AS product_name
       FROM transactions t
       JOIN insurance_products ip ON t.product_id = ip.id
       WHERE t.user_id = $1
       ORDER BY t.transaction_date DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/getTransactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1',
      [req.user.id]
    );
    res.json(transactions.rows);
  } catch (error) {
    console.error('Error in /getTransactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router; 