// claims.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

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
 *               product_id:
 *                 type: integer
 *               claim_amount:
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
router.post('/', authMiddleware, async (req, res) => {
  const { product_id, claim_amount } = req.body;

  // Validate that all required fields are present
  if (!product_id || !claim_amount) {
    return res.status(400).json({ error: 'All fields (product_id, claim_amount) are required' });
  }

  try {
    // Check if the product exists and is approved
    const productResult = await pool.query(
      'SELECT * FROM insurance_products WHERE id = $1 AND is_approved = true',
      [product_id]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or not approved' });
    }

    // Insert the new claim into the database
    const result = await pool.query(
      `INSERT INTO claims (user_id, product_id, claim_amount, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, product_id, claim_amount, 'pending'] // Use the userId from the JWT token
    );

    // Return the newly created claim
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in /claims:', error);
    res.status(500).json({ error: 'Failed to submit claim' });
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
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Verify claim ownership
    const claimCheck = await pool.query(
      'SELECT id FROM claims WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (claimCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      'UPDATE claims SET status = $1 WHERE id = $2 RETURNING *',
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
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const claim = await pool.query(
      'DELETE FROM claims WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.id]
    );
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
 *     summary: Get all claims for the authenticated user
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of claims
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM claims WHERE user_id = $1',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /claims/{id}:
 *   get:
 *     summary: Get a specific claim by ID
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
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM claims WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Claim not found or access denied" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Submit a claim for a specific policy
router.post('/:policyId', authMiddleware, async (req, res) => {
  const { policyId } = req.params;
  const { claim_amount } = req.body;

  try {
    const policyResult = await pool.query(
      `SELECT * FROM policy_purchases 
       WHERE id = $1 AND user_id = $2 AND status = 'approved'`,
      [policyId, req.user.id]
    );

    if (policyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found or not approved' });
    }

    const claimResult = await pool.query(
      `INSERT INTO claims 
        (user_id, product_id, claim_amount, status) 
       VALUES 
        ($1, $2, $3, 'pending') 
       RETURNING *`,
      [req.user.id, policyResult.rows[0].product_id, claim_amount]
    );

    res.status(201).json(claimResult.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/submitForClaim', authMiddleware, async (req, res) => {
  const { policy_purchase_id, claim_amount } = req.body;

  // Validate request body
  if (!policy_purchase_id || !claim_amount) {
    return res.status(400).json({ error: 'Policy Purchase ID and claim amount are required' });
  }

  try {
    // Check if the policy purchase exists, belongs to the user, and is approved
    const policyPurchaseResult = await pool.query(
      `SELECT * FROM policy_purchases 
       WHERE id = $1 AND user_id = $2 AND status = 'approved'`,
      [policy_purchase_id, req.user.id]
    );
    if (policyPurchaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Policy purchase not found, not approved, or does not belong to the user' });
    }

    // Check if the user has already claimed this policy purchase
    const existingClaim = await pool.query(
      'SELECT * FROM claims WHERE policy_purchase_id = $1',
      [policy_purchase_id]
    );
    if (existingClaim.rows.length > 0) {
      return res.status(400).json({ error: 'You have already claimed this policy purchase' });
    }

    // Insert the new claim into the database
    const claim = await pool.query(
      `INSERT INTO claims (policy_purchase_id, claim_amount, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [policy_purchase_id, claim_amount, 'pending']
    );

    res.status(201).json(claim.rows[0]);
  } catch (error) {
    console.error('Error in /submitForClaim:', error);
    res.status(500).json({ error: 'Failed to submit claim', details: error.message });
  }
});

// Fetch claims for a specific user
router.get('/userClaims', authMiddleware, async (req, res) => {
  try {
    const claims = await pool.query(
      'SELECT * FROM claims WHERE user_id = $1',
      [req.user.id] // Use req.user.id to fetch claims for the logged-in user
    );
    res.json(claims.rows);
  } catch (error) {
    console.error('Error in /userClaims:', error);
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

module.exports = router;
