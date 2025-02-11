// product.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all approved insurance products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of approved products
 *       500:
 *         description: Failed to fetch products
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, coverage_amount, premium, duration 
       FROM insurance_products 
       WHERE is_approved = true 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Submit a new insurance product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - coverage_amount
 *               - premium
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               coverage_amount:
 *                 type: number
 *               premium:
 *                 type: number
 *               duration:
 *                 type: integer
 *                 description: Duration in months (0 for lifetime)
 *     responses:
 *       201:
 *         description: Product submitted successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Product submission failed
 */
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, coverage_amount, premium, duration } = req.body;
  if (!title || !description || !coverage_amount || !premium || !duration) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO insurance_products 
       (title, description, coverage_amount, premium, duration, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, title, description, coverage_amount, premium, duration, is_approved`,
      [title, description, coverage_amount, premium, duration, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Product submission failed' });
  }
});

/**
 * @swagger
 * /products/mine:
 *   get:
 *     summary: Get all products submitted by the authenticated user
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of your products
 *       500:
 *         description: Failed to fetch your products
 */
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insurance_products WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your products' });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get details of a specific product
 *     tags: [Products]
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
 *         description: Product details
 *       403:
 *         description: Access denied (if product is unapproved and the requester isn't the creator/admin)
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to fetch product
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insurance_products WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = result.rows[0];
    // If the product is unapproved, only the creator or an admin may view it
    if (!product.is_approved && product.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (only allowed for the creator or an admin)
 *     tags: [Products]
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
 *         description: Product deleted successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to delete product
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insurance_products WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = result.rows[0];
    if (product.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    await pool.query('DELETE FROM insurance_products WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

/**
 * @swagger
 * /products/buy:
 *   post:
 *     summary: Buy a product (create a policy)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - startDate
 *               - endDate
 *             properties:
 *               productId:
 *                 type: integer
 *               startDate:
 *                 type: string
 *               endDate:
 *                 type: string
 *     responses:
 *       201:
 *         description: Policy purchased successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Product not found or not approved
 *       500:
 *         description: Failed to purchase product
 */
router.post('/buy', authMiddleware, async (req, res) => {
  const { productId, startDate, endDate } = req.body;

  // Validate that all required fields are present
  if (!productId || !startDate || !endDate) {
    return res.status(400).json({ error: 'All fields (productId, startDate, endDate) are required' });
  }

  try {
    // Check if the product exists and is approved
    const productResult = await pool.query(
      'SELECT * FROM insurance_products WHERE id = $1 AND is_approved = true',
      [productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or not approved' });
    }

    // Insert the new policy purchase into the database
    const result = await pool.query(
      `INSERT INTO policy_purchases (user_id, product_id, purchase_date, valid_until, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, productId, startDate, endDate, 'pending'] // Use the userId from the JWT token
    );

    // Return the newly purchased policy
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in /buy:', error);
    res.status(500).json({ error: 'Failed to purchase product' });
  }
});

/**
 * @swagger
 * /products/myPolicies:
 *   get:
 *     summary: Get all products purchased by the authenticated user with their status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of your products with their status
 *       500:
 *         description: Failed to fetch your policies
 */
router.get('/myPolicies', authMiddleware, async (req, res) => {
  try {
    // Fetch products associated with the logged-in user's policies
    const result = await pool.query(
      `SELECT ip.id, ip.title, ip.description, ip.coverage_amount, ip.premium, ip.duration, pp.status
       FROM insurance_products ip
       INNER JOIN policy_purchases pp ON ip.id = pp.product_id
       WHERE pp.user_id = $1`,
      [req.user.id]
    );

    // Return the user's products with their status
    res.json(result.rows);
  } catch (error) {
    console.error('Error in /myPolicies:', error);
    res.status(500).json({ error: 'Failed to fetch your policies' });
  }
});

/**
 * @swagger
 * /products/buyProduct:
 *   post:
 *     summary: Buy a product (create a policy)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *             properties:
 *               product_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Policy purchased successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Product not found or not approved
 *       500:
 *         description: Failed to purchase product
 */
router.post('/buyProduct', authMiddleware, async (req, res) => {
  const { product_id } = req.body;
  try {
    const purchase = await pool.query(
      'INSERT INTO policy_purchases (user_id, product_id) VALUES ($1, $2) RETURNING *',
      [req.user.id, product_id] // Use req.user.id
    );
    res.json(purchase.rows[0]);
  } catch (error) {
    console.error('Error in /buyProduct:', error);
    res.status(500).json({ error: 'Failed to purchase product' });
  }
});

module.exports = router;
