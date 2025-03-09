// /**
//  * @swagger
//  * components:
//  *   schemas:
//  *     User:
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
//  *         name: Jane Doe
//  *         email: jane.doe@example.com
//  *         role: admin
//  *         created_at: "2025-01-01T12:00:00Z"
//  * 
//  *     PolicyPurchase:
//  *       type: object
//  *       properties:
//  *         id:
//  *           type: integer
//  *         user_id:
//  *           type: integer
//  *         status:
//  *           type: string
//  *           enum: [pending, approved, denied]
//  *         created_at:
//  *           type: string
//  *           format: date-time
//  *       example:
//  *         id: 101
//  *         user_id: 1
//  *         status: pending
//  *         created_at: "2025-02-01T10:00:00Z"
//  * 
//  *     Claim:
//  *       type: object
//  *       properties:
//  *         id:
//  *           type: integer
//  *         policy_purchase_id:
//  *           type: integer
//  *         status:
//  *           type: string
//  *           enum: [pending, approved, denied]
//  *         rejection_reason:
//  *           type: string
//  *           nullable: true
//  *         user_id:
//  *           type: integer
//  *         email:
//  *           type: string
//  *           format: email
//  *         created_at:
//  *           type: string
//  *           format: date-time
//  *       example:
//  *         id: 201
//  *         policy_purchase_id: 101
//  *         status: pending
//  *         rejection_reason: null
//  *         user_id: 1
//  *         email: jane.doe@example.com
//  *         created_at: "2025-02-10T14:00:00Z"
//  *
//  *   securitySchemes:
//  *     bearerAuth:
//  *       type: http
//  *       scheme: bearer
//  *       bearerFormat: JWT
//  *
//  * api/admin/users:
//  *   get:
//  *     summary: Get all users (admin only)
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: A list of users.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/User'
//  *       403:
//  *         description: Forbidden – Admin privileges required.
//  *       500:
//  *         description: Failed to fetch users.
//  *
//  * api/pendingPolicies:
//  *   get:
//  *     summary: Fetch pending policy purchases
//  *     tags: [Policies]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: A list of pending policy purchases.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/PolicyPurchase'
//  *       500:
//  *         description: Failed to fetch pending policies.
//  *
//  * /approvePolicy/{policyId}:
//  *   post:
//  *     summary: Approve or reject a policy purchase (admin only)
//  *     tags: [Policies]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: policyId
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: The ID of the policy purchase.
//  *     requestBody:
//  *       description: Payload containing the decision.
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               decision:
//  *                 type: boolean
//  *                 description: Set to true to approve, false to reject.
//  *             required:
//  *               - decision
//  *     responses:
//  *       200:
//  *         description: Policy status updated.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                 message:
//  *                   type: string
//  *       403:
//  *         description: Forbidden – Admin privileges required.
//  *       500:
//  *         description: Failed to process policy decision.
//  *
//  * /pendingClaims:
//  *   get:
//  *     summary: Fetch pending claims
//  *     tags: [Claims]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: A list of pending claims.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/Claim'
//  *       500:
//  *         description: Failed to fetch pending claims.
//  *
//  * /approveClaim/{claimId}:
//  *   post:
//  *     summary: Approve or reject a claim (admin only)
//  *     tags: [Claims]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: claimId
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: The ID of the claim.
//  *     requestBody:
//  *       description: Payload containing the decision and optional rejection reason.
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               decision:
//  *                 type: boolean
//  *                 description: Set to true to approve, false to reject.
//  *               rejection_reason:
//  *                 type: string
//  *                 description: Optional reason for rejection.
//  *             required:
//  *               - decision
//  *     responses:
//  *       200:
//  *         description: Claim status updated.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                 message:
//  *                   type: string
//  *       403:
//  *         description: Forbidden – Admin privileges required.
//  *       500:
//  *         description: Failed to process claim decision.
//  */

const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { sendEmail } = require('../mail');

/**
 * Middleware to check admin privileges.
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

// /**
//  * @swagger
//  * /users:
//  *   get:
//  *     summary: Get all users (admin only)
//  *     tags: [Admin]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: A list of users.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/User'
//  *       403:
//  *         description: Forbidden – Admin privileges required.
//  *       500:
//  *         description: Failed to fetch users.
//  */
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Utility function to get user email with role check.
 *
 * @param {number} userId - The user ID.
 * @returns {Promise<string|undefined>} The user's email if found.
 */
const getRecipientEmail = async (userId) => {
  const result = await pool.query(
    'SELECT email FROM users WHERE id = $1 AND role = $2',
    [userId, 'user']
  );
  return result.rows[0]?.email;
};

// /**
//  * @swagger
//  * /approvePolicy/{policyId}:
//  *   post:
//  *     summary: Approve or reject a policy purchase (admin only)
//  *     tags: [Policies]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: policyId
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: The ID of the policy purchase.
//  *     requestBody:
//  *       description: Payload containing the decision.
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               decision:
//  *                 type: boolean
//  *                 description: Set to true to approve, false to reject.
//  *             required:
//  *               - decision
//  *     responses:
//  *       200:
//  *         description: Policy status updated.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                 message:
//  *                   type: string
//  *       403:
//  *         description: Forbidden – Admin privileges required.
//  *       500:
//  *         description: Failed to process policy decision.
//  */
router.post('/approvePolicy/:policyId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { policyId } = req.params;
    const { decision } = req.body;

    // 1. Update policy status
    const newStatus = decision ? 'approved' : 'denied';
    await pool.query(
      'UPDATE policy_purchases SET status = $1 WHERE id = $2',
      [newStatus, policyId]
    );

    // 2. Get user email
    const policy = await pool.query(
      'SELECT user_id FROM policy_purchases WHERE id = $1',
      [policyId]
    );
    const userEmail = await getRecipientEmail(policy.rows[0].user_id);

    // 3. Send notification if email exists
    if (userEmail) {
      const subject = decision ? 'Policy Approved' : 'Policy Rejected';
      try {
        await sendEmail(
          userEmail,
          subject,
          decision ? 'policy_approved' : 'policy_rejected',
          {
            policyId,
            status: decision ? 'approved' : 'rejected',
            decisionDate: new Date().toLocaleDateString()
          }
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    res.json({ success: true, message: `Policy ${newStatus}` });
  } catch (error) {
    console.error('Policy approval error:', error);
    res.status(500).json({ error: 'Failed to process policy decision' });
  }
});

// /**
//  * @swagger
//  * /pendingPolicies:
//  *   get:
//  *     summary: Fetch pending policy purchases
//  *     tags: [Policies]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: A list of pending policy purchases.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/PolicyPurchase'
//  *       500:
//  *         description: Failed to fetch pending policies.
//  */
router.get('/pendingPolicies', authMiddleware, async (req, res) => {
  try {
    const policies = await pool.query(
      'SELECT * FROM policy_purchases WHERE status = $1',
      ['pending']
    );
    res.json(policies.rows);
  } catch (error) {
    console.error('Error in /pendingPolicies:', error);
    res.status(500).json({ error: 'Failed to fetch pending policies' });
  }
});

// /**
//  * @swagger
//  * /pendingClaims:
//  *   get:
//  *     summary: Fetch pending claims
//  *     tags: [Claims]
//  *     security:
//  *       - bearerAuth: []
//  *     responses:
//  *       200:
//  *         description: A list of pending claims.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/Claim'
//  *       500:
//  *         description: Failed to fetch pending claims.
//  */
router.get('/pendingClaims', authMiddleware, async (req, res) => {
  try {
    const claims = await pool.query(
      `SELECT c.*, pp.user_id, u.email 
       FROM claims c
       JOIN policy_purchases pp ON c.policy_purchase_id = pp.id
       JOIN users u ON pp.user_id = u.id
       WHERE c.status = 'pending'`
    );
    res.json(claims.rows);
  } catch (error) {
    console.error('Error in /pendingClaims:', error);
    res.status(500).json({ error: 'Failed to fetch pending claims' });
  }
});

// /**
//  * @swagger
//  * /approveClaim/{claimId}:
//  *   post:
//  *     summary: Approve or reject a claim (admin only)
//  *     tags: [Claims]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: claimId
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: The ID of the claim.
//  *     requestBody:
//  *       description: Payload containing the decision and optional rejection reason.
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               decision:
//  *                 type: boolean
//  *                 description: Set to true to approve, false to reject.
//  *               rejection_reason:
//  *                 type: string
//  *                 description: Optional reason for rejection.
//  *             required:
//  *               - decision
//  *     responses:
//  *       200:
//  *         description: Claim status updated.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                 message:
//  *                   type: string
//  *       403:
//  *         description: Forbidden – Admin privileges required.
//  *       500:
//  *         description: Failed to process claim decision.
//  */
router.post('/approveClaim/:claimId', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { claimId } = req.params;
    const { decision, rejection_reason } = req.body;

    // 1. Update claim status
    const newStatus = decision ? 'approved' : 'denied';
    await pool.query(
      'UPDATE claims SET status = $1, rejection_reason = $2 WHERE id = $3',
      [newStatus, rejection_reason || null, claimId]
    );

    // 2. Get user email through policy purchase
    const claim = await pool.query(
      `SELECT pp.user_id 
       FROM claims c
       JOIN policy_purchases pp ON c.policy_purchase_id = pp.id
       WHERE c.id = $1`,
      [claimId]
    );
    const userEmail = await getRecipientEmail(claim.rows[0].user_id);

    // 3. Send notification if email exists
    if (userEmail) {
      const subject = decision ? 'Claim Approved' : 'Claim Rejected';
      const template = decision ? 'claim_approved' : 'claim_rejected';
      
      try {
        await sendEmail(userEmail, subject, template, {
          claimId,
          decision,
          rejectionReason: rejection_reason || 'N/A'
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    res.json({ success: true, message: `Claim ${newStatus}` });
  } catch (error) {
    console.error('Claim approval error:', error);
    res.status(500).json({ error: 'Failed to process claim decision' });
  }
});

module.exports = router;
