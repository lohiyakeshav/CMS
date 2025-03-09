const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const { sendEmail } = require('../mail');
require('dotenv').config();

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

router.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
});
router.use(limiter);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: "SecurePassword123"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Registration failed
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Invalid email'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { name, email, password, role = 'user' } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO users (name, email, password, role) 
         VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
        [name, email, hashedPassword, role]
      );
      // Send welcome email if needed
      sendEmail(email, 'Welcome to InsurePro', 'welcome', { name });
      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in a user and return JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "keshav@gmail.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Successful login returns token and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Login failed
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const user = await pool.query(
      'SELECT id, name, password, role, email FROM users WHERE email = $1',
      [email]
    );
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user.rows[0].id, role: user.rows[0].role },
      SECRET_KEY,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    // Send login notification email
    try {
      await sendEmail(
        user.rows[0].email, // Use email from database
        'Successful Login Notification',
        'loginAlert',
        {
          name: user.rows[0].name,
          loginTime: new Date().toLocaleString(),
        }
      );
    } catch (emailError) {
      console.error('Login email notification failed:', emailError);
    }
    
    res.json({
      token,
      user: {
        id: user.rows[0].id,
        name: user.rows[0].name,
        role: user.rows[0].role,
      },
    });
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the current user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the user's profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 *                 role:
 *                   type: string
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to fetch user details
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // If req.user is defined, req.user.id should be available
    const result = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: Update a user's details
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "NewSecurePassword123"
 *     responses:
 *       200:
 *         description: User details updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden, only admins can update roles
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to update user
 */
router.put('/update', authMiddleware, async (req, res) => {
  const { name, email, password, role } = req.body;

  // Ensure only an admin can update the role
  if (req.user.role !== 'admin' && role) {
    return res.status(403).json({ error: 'Only admins can update user roles' });
  }

  try {
    // Validate if the email is already taken by another user
    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, req.user.id]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Hash new password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updateFields = [name, email, hashedPassword, role];
    const setClause = [];
    let paramCount = 1;

    if (name) setClause.push(`name = $${paramCount++}`);
    if (email) setClause.push(`email = $${paramCount++}`);
    if (hashedPassword) setClause.push(`password = $${paramCount++}`);
    if (role) setClause.push(`role = $${paramCount++}`);

    const queryText = `UPDATE users SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role`;
    
    const result = await pool.query(queryText, [...updateFields, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * @swagger
 * /api/auth/delete/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden, only admins can delete users
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to delete user
 */
router.delete('/delete/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  // Only allow admins to delete users
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete users' });
  }

  try {
    // Check if user exists before deleting
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete the user
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    res.json({ message: 'User deleted successfully', userId: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


module.exports = router;


module.exports = router;
