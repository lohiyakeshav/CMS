// claimsCRUD.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @swagger
 * components:
 *   schemas:
 *     Claim:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         policy_purchase_id:
 *           type: integer
 *         claim_amount:
 *           type: number
 *         claim_date:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *         approved_by:
 *           type: integer
 *         approved_at:
 *           type: string
 *           format: date-time
 *         rejection_reason:
 *           type: string
 */

/**
 * @swagger
 * /claimsCRUD:
 *   post:
 *     summary: Create a new claim
 *     tags: [Claims CRUD]
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
 *                 example: 1
 *               claim_amount:
 *                 type: number
 *                 example: 5000
 *               status:
 *                 type: string
 *                 example: "pending"
 *               approved_by:
 *                 type: integer
 *                 example: 2
 *               rejection_reason:
 *                 type: string
 *                 example: "Incomplete documentation"
 *     responses:
 *       201:
 *         description: Claim created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Claim'
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  const { policy_purchase_id, claim_amount, status, approved_by, rejection_reason } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO claims 
         (policy_purchase_id, claim_amount, status, approved_by, rejection_reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [policy_purchase_id, claim_amount, status || 'pending', approved_by || null, rejection_reason || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating claim:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /claimsCRUD:
 *   get:
 *     summary: Retrieve all claims
 *     tags: [Claims CRUD]
 *     responses:
 *       200:
 *         description: A list of claims
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Claim'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM claims ORDER BY id ASC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching claims:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /claimsCRUD/{id}:
 *   get:
 *     summary: Retrieve a specific claim by ID
 *     tags: [Claims CRUD]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The claim ID
 *     responses:
 *       200:
 *         description: The claim details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Claim'
 *       404:
 *         description: Claim not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM claims WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching claim:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /claimsCRUD/{id}:
 *   put:
 *     summary: Update a claim by ID
 *     tags: [Claims CRUD]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               policy_purchase_id:
 *                 type: integer
 *                 example: 1
 *               claim_amount:
 *                 type: number
 *                 example: 5500
 *               status:
 *                 type: string
 *                 example: "approved"
 *               approved_by:
 *                 type: integer
 *                 example: 2
 *               rejection_reason:
 *                 type: string
 *                 example: null
 *     responses:
 *       200:
 *         description: The updated claim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Claim'
 *       404:
 *         description: Claim not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { policy_purchase_id, claim_amount, status, approved_by, rejection_reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE claims 
         SET policy_purchase_id = $1, claim_amount = $2, status = $3, approved_by = $4, rejection_reason = $5
         WHERE id = $6
         RETURNING *`,
      [policy_purchase_id, claim_amount, status, approved_by, rejection_reason, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating claim:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /claimsCRUD/{id}:
 *   delete:
 *     summary: Delete a claim by ID
 *     tags: [Claims CRUD]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The claim ID
 *     responses:
 *       200:
 *         description: Claim deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Claim deleted successfully
 *       404:
 *         description: Claim not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM claims WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.status(200).json({ message: 'Claim deleted successfully' });
  } catch (error) {
    console.error('Error deleting claim:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
