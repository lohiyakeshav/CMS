/**
 * @swagger
 * tags:
 *   name: Policyholders
 *   description: API for managing policyholders
 */



const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware.js');


/**
 * @swagger
 * /policyholders:
 *   post:
 *     summary: Register a new policyholder
 *     tags: [Policyholders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Policyholder successfully registered
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */

// ✅ Create a New Policyholder (Register)
router.post('/', async (req, res) => {
    const { name, contact, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO policyholders (name, contact, password) VALUES ($1, $2, $3) RETURNING id, name, contact',
            [name, contact, hashedPassword]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /policyholders:
 *   get:
 *     summary: Get all policyholders
 *     tags: [Policyholders]
 *     responses:
 *       200:
 *         description: List of all policyholders
 *       500:
 *         description: Server error
 */
// ✅ Get All Policyholders (Protected)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, contact FROM policyholders');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /policyholders/{id}:
 *   get:
 *     summary: Get a specific policyholder by ID
 *     tags: [Policyholders]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the policyholder to fetch
 *     responses:
 *       200:
 *         description: Policyholder found
 *       404:
 *         description: Policyholder not found
 *       500:
 *         description: Server error
 */

// ✅ Get a Specific Policyholder by ID (Protected)
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, contact FROM policyholders WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Policyholder not found.' });

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /policyholders/{id}:
 *   put:
 *     summary: Update a policyholder
 *     tags: [Policyholders]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the policyholder to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               contact:
 *                 type: string
 *     responses:
 *       200:
 *         description: Policyholder updated
 *       404:
 *         description: Policyholder not found
 *       500:
 *         description: Server error
 */

// ✅ Update a Policyholder (Protected)
router.put('/:id', authenticateToken, async (req, res) => {
    const { name, contact } = req.body;

    try {
        const existing = await pool.query('SELECT * FROM policyholders WHERE id = $1', [req.params.id]);
        if (existing.rows.length === 0) return res.status(404).json({ error: 'Policyholder not found.' });

        const updated = await pool.query(
            'UPDATE policyholders SET name = $1, contact = $2 WHERE id = $3 RETURNING id, name, contact',
            [name || existing.rows[0].name, contact || existing.rows[0].contact, req.params.id]
        );

        res.json(updated.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /policyholders/{id}:
 *   delete:
 *     summary: Delete a policyholder and associated policies
 *     tags: [Policyholders]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the policyholder to delete
 *     responses:
 *       204:
 *         description: Policyholder successfully deleted
 *       404:
 *         description: Policyholder not found
 *       500:
 *         description: Server error
 */


// ✅ Delete a Policyholder and Associated Policies (Protected)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM policyholders WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Policyholder not found' });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



/**
 * @swagger
 * /policyholders/me:
 *   get:
 *     summary: Get the logged-in policyholder's data
 *     tags: [Policyholders]
 *     responses:
 *       200:
 *         description: Logged-in policyholder data
 *       401:
 *         description: Invalid token payload
 *       500:
 *         description: Server error
 */


router.get('/me', authenticateToken, (req, res) => {
  if (!req.policyholder?.id) {
    return res.status(401).json({ error: 'Invalid token payload' });
  }
  // ... rest of handler ...
});

// Get all approved insurance products
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, description, coverage_amount, premium, duration FROM insurance_products WHERE is_approved = true'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get policyholder's purchased policies
router.get('/policies', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.purchase_date, p.valid_until, p.status,
              i.title, i.description, i.coverage_amount
       FROM policy_purchases p
       JOIN insurance_products i ON p.product_id = i.id
       WHERE p.policyholder_id = $1`,
      [req.policyholder.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase insurance product
router.post('/purchase', authenticateToken, async (req, res) => {
  const { product_id } = req.body;
  try {
    // Verify product exists and is approved
    const product = await pool.query(
      `SELECT id, premium, duration 
       FROM insurance_products 
       WHERE id = $1 AND is_approved = true`,
      [product_id]
    );

    if (product.rows.length === 0) {
      return res.status(400).json({ 
        error: "Product not available for purchase or not approved" 
      });
    }

    await pool.query('BEGIN');

    // Create policy purchase record
    const purchase = await pool.query(
      `INSERT INTO policy_purchases 
       (policyholder_id, product_id, valid_until)
       VALUES ($1, $2, CURRENT_DATE + INTERVAL '1 month' * $3)
       RETURNING id, purchase_date, valid_until`,
      [req.policyholder.id, product_id, product.rows[0].duration]
    );

    // Create transaction record
    const transaction = await pool.query(
      `INSERT INTO transactions 
       (policyholder_id, product_id, amount, transaction_type)
       VALUES ($1, $2, $3, 'purchase')
       RETURNING id, transaction_date, amount`,
      [req.policyholder.id, product_id, product.rows[0].premium]
    );

    await pool.query('COMMIT');
    
    res.status(201).json({
      policy_purchase: purchase.rows[0],
      transaction: transaction.rows[0]
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  }
});

// Get policyholder's transaction history
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.transaction_date, t.amount, 
              t.transaction_type, t.status,
              i.title AS product_name
       FROM transactions t
       JOIN insurance_products i ON t.product_id = i.id
       WHERE t.policyholder_id = $1
       ORDER BY t.transaction_date DESC`,
      [req.policyholder.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get policyholder profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at 
       FROM policyholders 
       WHERE id = $1`,
      [req.policyholder.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update policyholder profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await pool.query(
      `UPDATE policyholders 
       SET name = $1, email = $2 
       WHERE id = $3 
       RETURNING id, name, email, created_at`,
      [name, email, req.policyholder.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

module.exports = router;
