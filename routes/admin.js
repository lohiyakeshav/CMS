const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/authMiddleware');
const { sendEmail } = require('../mail');

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

// Utility function to get user email with role check
const getRecipientEmail = async (userId) => {
  const result = await pool.query(
    'SELECT email FROM users WHERE id = $1 AND role = $2',
    [userId, 'user']
  );
  return result.rows[0]?.email;
};

// Approve/Reject Policy
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

// Approve/Reject Claim
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
