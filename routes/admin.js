const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware to check admin privileges
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

// Example: Get all users (admin only)
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

// Other admin routes...
// For example, approving a policy purchase:
router.post('/approvePolicy/:policyId', authMiddleware, async (req, res) => {
  const { policyId } = req.params;
  const { decision } = req.body; // decision: true (approve) or false (reject)
  try {
    const status = decision ? 'approved' : 'denied';
    const policy = await pool.query(
      'UPDATE policy_purchases SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, req.user.id, policyId]
    );
    if (policy.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    res.json(policy.rows[0]);
  } catch (error) {
    console.error('Error in /approvePolicy:', error);
    res.status(500).json({ error: 'Failed to update policy status' });
  }
});

// Fetch pending policies
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

// Fetch pending claims
router.get('/pendingClaims', authMiddleware, async (req, res) => {
  try {
    const claims = await pool.query(
      'SELECT * FROM claims WHERE status = $1',
      ['pending']
    );
    res.json(claims.rows);
  } catch (error) {
    console.error('Error in /pendingClaims:', error);
    res.status(500).json({ error: 'Failed to fetch pending claims' });
  }
});

// Approve or reject a claim
router.post('/approveClaim/:claimId', authMiddleware, async (req, res) => {
  const { claimId } = req.params;
  const { decision, rejection_reason } = req.body; // decision: true (approve) or false (reject)
  try {
    const status = decision ? 'approved' : 'denied';
    const claim = await pool.query(
      'UPDATE claims SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, rejection_reason = $3 WHERE id = $4 RETURNING *',
      [status, req.user.id, rejection_reason, claimId]
    );
    if (claim.rows.length === 0) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    res.json(claim.rows[0]);
  } catch (error) {
    console.error('Error in /approveClaim:', error);
    res.status(500).json({ error: 'Failed to update claim status' });
  }
});

module.exports = router;
