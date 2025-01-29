const express = require('express');
const router = express.Router();
const { policies } = require('../models/policy');
const { policyholders } = require('../models/policyholder');

// Create Policy
router.post('/', (req, res) => {
  const { id, type, amount, policyholderId, startDate, endDate } = req.body;
  
  // Required fields check
  if (!id || !type || !amount || !policyholderId || !startDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate end date
  if (endDate && new Date(endDate) < new Date()) {
    return res.status(400).json({ error: 'Policy end date cannot be in the past' });
  }

  // Check if policyholder exists
  const policyholder = policyholders.find(ph => ph.id === policyholderId);
  if (!policyholder) {
    return res.status(404).json({ error: 'Policyholder not found' });
  }

  // Add to policyholder's policies
  const newPolicy = { id, type, premium: 0, amount, startDate, endDate };
  policies.push(newPolicy);
  policyholder.policies.push(newPolicy);
  
  res.status(201).json(newPolicy);
});

// Get all policies
router.get('/', (req, res) => {
  res.json(policies);
});

// Get specific policy
router.get('/:id', (req, res) => {
  const policy = policies.find(p => p.id === req.params.id);
  if (!policy) return res.status(404).json({ error: 'Policy not found' });
  res.json(policy);
});

router.delete('/:id', (req, res) => {
  const index = policies.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Policy not found' });

  policies.splice(index, 1);
  res.status(204).send();
});


module.exports = router; 