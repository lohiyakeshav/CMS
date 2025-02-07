/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API
 */


const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware'); // Add this line

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;




/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new policyholder
 *     tags: [Auth]
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
 *       409:
 *         description: User already exists
 *       500:
 *         description: Server error
 */
// ✅ Register a New Policyholder
router.post('/register', async (req, res) => {
    const { name, contact, password } = req.body;

    if (!name || !contact || !password) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const existingUser = await pool.query("SELECT id FROM policyholders WHERE contact = $1", [contact]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            "INSERT INTO policyholders (name, contact, password) VALUES ($1, $2, $3) RETURNING id, name, contact",
            [name, contact, hashedPassword]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login as a policyholder
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contact:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       400:
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
// ✅ Login Using Policyholders Table
router.post('/login', async (req, res) => {
    const { contact, password } = req.body;

    if (!contact || !password) {
        return res.status(400).json({ error: "Missing credentials" });
    }

    try {
        const policyholder = await pool.query('SELECT * FROM policyholders WHERE contact = $1', [contact]);
        if (policyholder.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

        const isValid = await bcrypt.compare(password, policyholder.rows[0].password);
        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign(
            { policyholderId: policyholder.rows[0].id },
            SECRET_KEY,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the current logged-in user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 contact:
 *                   type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

// ✅ Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, contact FROM policyholders WHERE id = $1',
            [req.policyholder.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;