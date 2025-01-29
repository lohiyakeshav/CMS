const express = require('express');
const router = express.Router();
const { claims } = require('../models/claim');
const { policies } = require('../models/policy');

const validTransitions = {
  pending: ['approved', 'denied'],
  approved: ['paid'],
  denied: [],
  paid: []
};

// Create a Claim
router.post('/', (req, res) => {
  const { id, amount, date, description, policyId } = req.body;

  if (!id || !amount || !policyId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const policy = policies.find(p => p.id === policyId);
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  if (policy.endDate && new Date(policy.endDate) < new Date(date || new Date())) {
    return res.status(400).json({ error: 'Policy has expired' });
  }

  if (amount > policy.amount) {
    return res.status(400).json({ error: `Claim amount (${amount}) exceeds policy limit (${policy.amount})` });
  }

  const newClaim = { 
    id, 
    amount, 
    date: date || new Date().toISOString(), 
    description, 
    policyId, 
    status: 'pending'  
  };

  claims.push(newClaim);
  res.status(201).json(newClaim);
});

// Update a Claim (Status Transition)
router.put('/:id', (req, res) => {
  const claim = claims.find(c => c.id === req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  if (req.body.status) {
    if (!validTransitions[claim.status]?.includes(req.body.status)) {
      return res.status(400).json({ error: `Invalid status transition from ${claim.status} to ${req.body.status}` });
    }
    claim.status = req.body.status;
  }

  res.json(claim);
});

router.delete('/:id', (req, res) => {
  const index = claims.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Claim not found' });

  claims.splice(index, 1);
  res.status(204).send();
});


module.exports = router;
