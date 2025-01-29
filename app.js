const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
const policyholderRoutes = require('./routes/policyholders');
const policyRoutes = require('./routes/policies');
const claimRoutes = require('./routes/claims');
app.use('/policyholders', policyholderRoutes);
app.use('/policies', policyRoutes);
app.use('/claims', claimRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('Claims Management System API is running!');
});

// Modified server startup
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
  module.exports = { app, server };
} else {
  module.exports = { app }; // Export app without starting server
}


