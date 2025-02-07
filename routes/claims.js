/**
 * @swagger
 * tags:
 *   name: Claims
 *   description: API for managing insurance claims
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

const express = require('express');
const router = express.Router();
const pool = require('../db'); // Import PostgreSQL connection
const authenticateToken = require('../middleware/authMiddleware.js'); // Import JWT middleware

const validTransitions = {
  pending: ['approved', 'denied'],
  approved: ['paid'],
  denied: [],
  paid: []
};


/**
 * @swagger
 * /claims:
 *   post:
 *     summary: Create a new claim
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               policyId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Claim created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */

// ✅ Create a Claim (Protected Route)
router.post('/', authenticateToken, async (req, res) => {
  const { policyId, amount, description } = req.body;

  // Required fields check
  if (!policyId || !amount) {
    return res.status(400).json({ 
      error: 'Missing required fields: policyId and amount are mandatory' 
    });
  }

  try {
    const policy = await pool.query('SELECT * FROM policies WHERE id = $1', [policyId]);
    if (policy.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    if (amount > policy.rows[0].amount) {
      return res.status(400).json({ error: `Claim amount (${amount}) exceeds policy limit (${policy.rows[0].amount})` });
    }

    const result = await pool.query(
      'INSERT INTO claims (policy_id, amount, description) VALUES ($1, $2, $3) RETURNING *',
      [policyId, amount, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /claims/{id}:
 *   put:
 *     summary: Update a claim status
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim status updated
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Claim not found
 */

// ✅ Update a Claim Status (Protected Route)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    
    // First verify ownership
    const claimCheck = await pool.query(`
      SELECT c.id 
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      WHERE c.id = $1 AND p.policyholder_id = $2
    `, [req.params.id, req.policyholder.id]);

    if (claimCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Proceed with update...
    const result = await pool.query(
      "UPDATE claims SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /claims/{id}:
 *   delete:
 *     summary: Delete a claim
 *     tags: [Claims]
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
 *         description: Claim deleted successfully
 *       404:
 *         description: Claim not found
 *       401:
 *         description: Unauthorized
 */

// ✅ Delete a Claim (Protected Route)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const claim = await pool.query('DELETE FROM claims WHERE id = $1 RETURNING *', [req.params.id]);
    if (claim.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @swagger
 * /claims:
 *   get:
 *     summary: Get all claims
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of claims
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// ✅ Get All Claims (Protected Route)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.* 
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      WHERE p.policyholder_id = $1
    `, [req.policyholder.id]);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @swagger
 * /claims/{id}:
 *   get:
 *     summary: Get a claim by ID
 *     tags: [Claims]
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
 *         description: Claim details
 *       404:
 *         description: Claim not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

// ✅ Get a Single Claim by ID (Protected Route)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.* 
      FROM claims c
      JOIN policies p ON c.policy_id = p.id
      WHERE c.id = $1 AND p.policyholder_id = $2
    `, [req.params.id, req.policyholder.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Claim not found or access denied" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
