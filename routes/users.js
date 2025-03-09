const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');

// /**
//  * @swagger
//  * components:
//  *   schemas:
//  *     UserProfile:
//  *       type: object
//  *       properties:
//  *         id:
//  *           type: integer
//  *         name:
//  *           type: string
//  *         email:
//  *           type: string
//  *           format: email
//  *         role:
//  *           type: string
//  *         created_at:
//  *           type: string
//  *           format: date-time
//  *       example:
//  *         id: 1
//  *         name: "John Doe"
//  *         email: "john.doe@example.com"
//  *         role: "user"
//  *         created_at: "2025-02-17T12:00:00Z"
//  *
//  * tags:
//  *   - name: Users
//  *     description: API for user profile management
//  */

// /**
//  * @swagger
//  * /users/profile:
//  *   get:
//  *     summary: Get the authenticated user's profile
//  *     tags: [Users]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: User profile details
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/UserProfile'
//  *       500:
//  *         description: Failed to fetch profile
//  */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// /**
//  * @swagger
//  * /users/profile:
//  *   put:
//  *     summary: Update the authenticated user's profile
//  *     tags: [Users]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               name:
//  *                 type: string
//  *               email:
//  *                 type: string
//  *                 format: email
//  *             required:
//  *               - name
//  *               - email
//  *     responses:
//  *       200:
//  *         description: Successfully updated user profile
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/UserProfile'
//  *       400:
//  *         description: Name and email are required
//  *       500:
//  *         description: Profile update failed
//  */
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2 
       WHERE id = $3 
       RETURNING id, name, email, role`,
      [name, email, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// /**
//  * @swagger
//  * /users/updateProfile:
//  *   put:
//  *     summary: Update user profile with an alternative endpoint
//  *     tags: [Users]
//  *     security:
//  *       - bearerAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               name:
//  *                 type: string
//  *               email:
//  *                 type: string
//  *                 format: email
//  *             required:
//  *               - name
//  *               - email
//  *     responses:
//  *       200:
//  *         description: Successfully updated user profile
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/UserProfile'
//  *       500:
//  *         description: Failed to update profile
//  */
router.put('/updateProfile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  try {
    const updatedUser = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, req.user.id]
    );
    res.json(updatedUser.rows[0]);
  } catch (error) {
    console.error('Error in /updateProfile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
