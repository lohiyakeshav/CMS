const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware'); // Add this line

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

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