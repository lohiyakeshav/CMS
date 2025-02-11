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


/**
 * @swagger
 * /claims/claimtriggered:
 *   post:
 *     summary: Trigger a new insurance claim
 *     description: Creates a new claim entry for an approved policy purchase
 *     tags: [Claims]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - policy_purchase_id
 *               - claim_amount
 *             properties:
 *               policy_purchase_id:
 *                 type: integer
 *                 example: 123
 *               claim_amount:
 *                 type: number
 *                 example: 5000.00
 *     responses:
 *       201:
 *         description: Claim successfully triggered
 *       400:
 *         description: Invalid request or duplicate claim
 *       500:
 *         description: Server error
 */
router.post('/claimtriggered', authMiddleware, async (req, res) => {
  console.log('⚡ Claim Trigger Endpoint Activated');
  const { policy_purchase_id, claim_amount } = req.body;

  try {
    // 1. Validate Policy Purchase
    const policyPurchase = await pool.query(
      `SELECT * FROM policy_purchases 
       WHERE id = $1 
       AND user_id = $2 
       AND status = 'approved'`,
      [policy_purchase_id, req.user.id]
    );

    if (policyPurchase.rows.length === 0) {
      console.warn('🚫 Invalid policy purchase attempt:', { policy_purchase_id, user: req.user.id });
      return res.status(400).json({ 
        error: 'Valid approved policy purchase not found' 
      });
    }

    // 2. Check Existing Claims
    const existingClaim = await pool.query(
      `SELECT * FROM claims 
       WHERE policy_purchase_id = $1`,
      [policy_purchase_id]
    );

    if (existingClaim.rows.length > 0) {
      console.warn('🚫 Duplicate claim attempt:', policy_purchase_id);
      return res.status(400).json({ 
        error: 'Claim already exists for this policy purchase' 
      });
    }

    // 3. Create New Claim
    const newClaim = await pool.query(
      `INSERT INTO claims 
       (policy_purchase_id, claim_amount, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING *`,
      [policy_purchase_id, claim_amount]
    );

    console.log('✅ New claim created:', newClaim.rows[0].id);
    res.status(201).json(newClaim.rows[0]);

  } catch (error) {
    console.error('💥 Claim Trigger Error:', error);
    res.status(500).json({ 
      error: 'Claim processing failed',
      details: error.message 
    });
  }
});


router.put('/approveClaim/:claimId', authMiddleware, async (req, res) => {
  const { claimId } = req.params;
  const { status, rejection_reason } = req.body;

  // Validate request body
  if (!status || !['approved', 'denied'].includes(status)) {
    return res.status(400).json({ error: 'Status must be "approved" or "denied"' });
  }
  if (status === 'denied' && !rejection_reason) {
    return res.status(400).json({ error: 'Rejection reason is required for denied claims' });
  }

  try {
    // Check if the claim exists
    const claimResult = await pool.query(
      'SELECT * FROM claims WHERE id = $1',
      [claimId]
    );
    if (claimResult.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Update the claim status
    const updatedClaim = await pool.query(
      `UPDATE claims 
       SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, rejection_reason = $3
       WHERE id = $4
       RETURNING *`,
      [status, req.user.id, rejection_reason, claimId]
    );

    res.status(200).json(updatedClaim.rows[0]);
  } catch (error) {
    console.error('Error in /approveClaim:', error);
    res.status(500).json({ error: 'Failed to update claim status', details: error.message });
  }
});

router.get('/pendingClaims', authMiddleware, async (req, res) => {
  try {
    const pendingClaims = await pool.query(
      `SELECT 
         c.id,
         c.policy_purchase_id,
         c.claim_amount,
         c.claim_date,
         c.status,
         c.approved_by,
         c.approved_at,
         c.rejection_reason,
         pp.user_id AS policy_user_id,
         pp.product_id AS policy_product_id,
         u.name AS user_name,
         ip.title AS product_title
       FROM claims c
       JOIN policy_purchases pp ON c.policy_purchase_id = pp.id
       JOIN users u ON pp.user_id = u.id
       JOIN insurance_products ip ON pp.product_id = ip.id
       WHERE c.status = 'pending'`
    );

    console.log('Fetched pending claims:', pendingClaims.rows);
    res.status(200).json(pendingClaims.rows);
  } catch (error) {
    console.error('Error in /pendingClaims:', error);
    res.status(500).json({ error: 'Failed to fetch pending claims', details: error.message });
  }
});

module.exports = router;
