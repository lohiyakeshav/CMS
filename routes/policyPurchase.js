// purchasePolicy.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// /**
//  * @swagger
//  * /api/policyPurchase/buy:
//  *   post:
//  *     summary: Purchase a new insurance policy
//  *     tags: [Policy Purchases]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - productId
//  *               - startDate
//  *               - endDate
//  *             properties:
//  *               productId:
//  *                 type: integer
//  *                 example: 123
//  *               medicalHistory:
//  *                 type: string
//  *                 example: "No pre-existing conditions"
//  *               age:
//  *                 type: integer
//  *                 example: 30
//  *               startDate:
//  *                 type: string
//  *                 format: date
//  *                 example: "2025-01-01"
//  *               endDate:
//  *                 type: string
//  *                 format: date
//  *                 example: "2026-01-01"
//  *     responses:
//  *       201:
//  *         description: Policy purchased successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 id:
//  *                   type: integer
//  *                   example: 1
//  *                 user_id:
//  *                   type: integer
//  *                   example: 45
//  *                 product_id:
//  *                   type: integer
//  *                   example: 123
//  *                 purchase_date:
//  *                   type: string
//  *                   format: date
//  *                   example: "2025-04-01"
//  *                 valid_until:
//  *                   type: string
//  *                   format: date
//  *                   example: "2026-01-01"
//  *                 status:
//  *                   type: string
//  *                   example: "pending"
//  *                 payment_status:
//  *                   type: string
//  *                   example: "pending"
//  *       400:
//  *         description: Missing required fields
//  *       404:
//  *         description: Product not found
//  *       500:
//  *         description: Server error
//  */
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

// /**
//  * @swagger
//  * /api/policyPurchase/getPurchases:
//  *   get:
//  *     summary: Get all policy purchases for the authenticated user
//  *     tags: [Policy Purchases]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: A list of policy purchases
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 type: object
//  *                 properties:
//  *                   id:
//  *                     type: integer
//  *                     example: 1
//  *                   user_id:
//  *                     type: integer
//  *                     example: 45
//  *                   product_id:
//  *                     type: integer
//  *                     example: 123
//  *                   purchase_date:
//  *                     type: string
//  *                     format: date
//  *                     example: "2025-04-01"
//  *                   valid_until:
//  *                     type: string
//  *                     format: date
//  *                     example: "2026-01-01"
//  *                   status:
//  *                     type: string
//  *                     example: "pending"
//  *                   payment_status:
//  *                     type: string
//  *                     example: "pending"
//  *       500:
//  *         description: Server error
//  */
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
