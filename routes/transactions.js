const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// /**
//  * @swagger
//  * components:
//  *   schemas:
//  *     Transaction:
//  *       type: object
//  *       properties:
//  *         id:
//  *           type: integer
//  *         amount:
//  *           type: number
//  *         transaction_type:
//  *           type: string
//  *         transaction_date:
//  *           type: string
//  *           format: date-time
//  *         status:
//  *           type: string
//  *         product_name:
//  *           type: string
//  *       example:
//  *         id: 1
//  *         amount: 99.99
//  *         transaction_type: "debit"
//  *         transaction_date: "2025-02-17T12:00:00Z"
//  *         status: "completed"
//  *         product_name: "Home Insurance"
//  *
//  * tags:
//  *   - name: Transactions
//  *     description: API for user transactions
//  */

// /**
//  * @swagger
//  * /transactions:
//  *   get:
//  *     summary: Get user transactions with product name
//  *     tags: [Transactions]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: List of transactions for the authenticated user
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/Transaction'
//  *       500:
//  *         description: Failed to fetch transactions
//  */
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

// /**
//  * @swagger
//  * /transactions/getTransactions:
//  *   get:
//  *     summary: Get all transactions for the authenticated user
//  *     tags: [Transactions]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: List of transactions for the authenticated user
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/Transaction'
//  *       500:
//  *         description: Failed to fetch transactions
//  */
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
