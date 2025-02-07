/**
 * @swagger
 * tags:
 *   name: Policies
 *   description: API for managing insurance policies
 */


const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

/**
 * @swagger
 * /policies:
 *   post:
 *     summary: Create a new policy
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               amount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Policy created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */

// ✅ Create Policy (Protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, amount, start_date, end_date } = req.body;
    
    const result = await pool.query(
      `INSERT INTO policies 
      (type, amount, policyholder_id, start_date, end_date) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *`,
      [type, amount, req.policyholder.id, start_date, end_date] // Use authenticated ID
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /policies:
 *   get:
 *     summary: Get all policies
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of policies
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// ✅ Get all policies (Protected)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM policies WHERE policyholder_id = $1',
      [req.policyholder.id] // Filter by owner
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /policies/{id}:
 *   get:
 *     summary: Get a specific policy by ID
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Policy details
 *       404:
 *         description: Policy not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */


// ✅ Get specific policy (Protected)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM policies 
      WHERE id = $1 AND policyholder_id = $2`,
      [req.params.id, req.policyholder.id] // Verify ownership
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Policy not found or access denied" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
/**
 * @swagger
 * /policies/{id}:
 *   delete:
 *     summary: Delete a policy
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Policy deleted successfully
 *       404:
 *         description: Policy not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */


// ✅ Delete Policy (Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // First verify ownership
    const policyCheck = await pool.query(
      'SELECT id FROM policies WHERE id = $1 AND policyholder_id = $2',
      [req.params.id, req.policyholder.id]
    );

    if (policyCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    await pool.query('DELETE FROM policies WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
