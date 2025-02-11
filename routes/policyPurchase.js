// purchasePolicy.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// POST /api/policyPurchase/buy
// Purchase a new policy (create a record in policy_purchases)
router.post('/buy', authenticateToken, async (req, res) => {
  const { productId, medicalHistory, age, startDate, endDate } = req.body;

  // Check that required fields are provided.
  if (!productId || !startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Missing required fields: productId, startDate, and endDate are required.'
    });
  }

  try {
    // Verify the product exists
    const productResult = await pool.query(
      'SELECT * FROM insurance_products WHERE id = $1',
      [productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Insert a new policy purchase
    const result = await pool.query(
      `INSERT INTO policy_purchases 
        (user_id, product_id, purchase_date, valid_until, status, payment_status)
       VALUES 
        ($1, $2, CURRENT_DATE, $3, 'pending', 'pending')
       RETURNING *`,
      [req.user.id, productId, endDate]
    );

    // Return the newly created purchase record
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error purchasing policy:', error);
    res.status(500).json({ error: 'Failed to purchase policy' });
  }
});

router.get('/getPurchases', authenticateToken, async (req, res) => {
  try {
    const purchases = await pool.query(
      'SELECT * FROM policy_purchases WHERE user_id = $1',
      [req.user.id]
    );
    res.json(purchases.rows);
  } catch (error) {
    console.error('Error in /getPurchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

module.exports = router;
