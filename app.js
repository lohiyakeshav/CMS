require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const authenticateToken = require('./middleware/authMiddleware');

// Middleware
app.use(express.json());
app.use(cors());

// Public routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Protected routes
const policyholderRoutes = require('./routes/policyholders');
const policyRoutes = require('./routes/policies');
const claimRoutes = require('./routes/claims');

app.use('/policyholders', authenticateToken, policyholderRoutes);
app.use('/policies', authenticateToken, policyRoutes);
app.use('/claims', authenticateToken, claimRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send('Claims Management System API is running!');
});

// Database connection
const pool = require('./db');
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error', err);
    } else {
        console.log('Connected to PostgreSQL:', res.rows[0]);
    }
});

// Server setup
if (process.env.NODE_ENV !== 'test') {
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
    module.exports = { app, server };
} else {
    module.exports = { app };
}