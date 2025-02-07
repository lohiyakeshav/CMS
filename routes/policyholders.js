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

module.exports = router;
