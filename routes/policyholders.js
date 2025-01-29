const express = require('express');
const router = express.Router();

// Import Policyholder and Policies models
const { policyholders } = require('../models/policyholder');
const { policies } = require('../models/policy'); // Ensure policies are imported

// Create a new Policyholder
router.post('/', (req, res) => {
  const { id, name, contact } = req.body;

  // Check for duplicate ID before validating required fields
  if (policyholders.some(ph => ph.id === id)) {
    return res.status(409).json({ error: 'Policyholder ID already exists' });  
  }

  if (!id || !name || !contact) {
    return res.status(400).json({ error: 'All fields (id, name, contact) are required.' });
  }

  const newPolicyholder = { id, name, contact, policies: [] };
  policyholders.push(newPolicyholder);
  res.status(201).json(newPolicyholder);
});

// Read all Policyholders
router.get('/', (req, res) => {
  res.json(policyholders);
});

// Read a specific Policyholder by ID
router.get('/:id', (req, res) => {
  const policyholder = policyholders.find(ph => ph.id === req.params.id);

  if (!policyholder) {
    return res.status(404).json({ error: 'Policyholder not found.' });
  }

  res.json(policyholder);
});

// Update a Policyholder
router.put('/:id', (req, res) => {
  const policyholder = policyholders.find(ph => ph.id === req.params.id);

  if (!policyholder) {
    return res.status(404).json({ error: 'Policyholder not found.' });
  }

  const { name, contact } = req.body;
  if (name) policyholder.name = name;
  if (contact) policyholder.contact = contact;

  res.json(policyholder);
});

// Delete a Policyholder and Associated Policies
router.delete('/:id', (req, res) => {
  const phIndex = policyholders.findIndex(ph => ph.id === req.params.id);
  if (phIndex === -1) {
    return res.status(404).json({ error: 'Policyholder not found' });
  }

  // Remove associated policies
  for (let i = policies.length - 1; i >= 0; i--) {
    if (policies[i].policyholderId === req.params.id) {
      policies.splice(i, 1);
    }
  }

  // Delete policyholder
  policyholders.splice(phIndex, 1);

  res.status(204).send();
});

module.exports = router;
