const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware.js');

// ✅ Create Policy (Protected)
router.post('/', authenticateToken, async (req, res) => {
  const { type, amount, policyholderId, startDate, endDate } = req.body;

  if (!type || !amount || !policyholderId || !startDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;
    
    if (isNaN(start)) {
      return res.status(400).json({ error: 'Invalid start date format' });
    }
    
    if (endDate && isNaN(end)) {
      return res.status(400).json({ error: 'Invalid end date format' });
    }



    // Verify that policyholder exists
    const policyholder = await pool.query('SELECT id FROM policyholders WHERE id = $1', [policyholderId]);
    if (policyholder.rows.length === 0) {
      return res.status(404).json({ error: 'Policyholder not found' });
    }

    // Create the policy
    const result = await pool.query(
      'INSERT INTO policies (type, amount, policyholder_id, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [type, amount, policyholderId, startDate, endDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '22007') { // PostgreSQL invalid date format error code
      return res.status(400).json({ error: 'Invalid date format' });
    }
    console.error("Policy creation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all policies (Protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM policies');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get specific policy (Protected)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM policies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Policy not found' });

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete Policy (Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM policies WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Policy not found' });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
