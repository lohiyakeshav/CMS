
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const policiesRoutes = require('./routes/policies');
const claimsRoutes = require('./routes/claims');
const prometheusMiddleware = require('express-prometheus-middleware');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Monitoring Middleware
app.use(
  prometheusMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5], // Customize latency buckets
    requestSizeBuckets: [100, 1000, 5000],
    responseSizeBuckets: [100, 1000, 5000],
  })
);


// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log the request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Log the response status and time taken
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// Test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// Routes
const usersRouter = require('./routes/users');
const productsRouter = require('./routes/products');
const adminRouter = require('./routes/admin');
const transactionsRouter = require('./routes/transactions');

const purchasePolicyRouter = require('./routes/policyPurchase');
const policiesRouter = require('./routes/policies');
const claimsRouter = require('./routes/claims');

app.use('/api/policyPurchase', purchasePolicyRouter);
app.use('/api/policies', policiesRouter);
app.use('/api/claims', claimsRouter);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/transactions', transactionsRouter);

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connection successful:', res.rows[0].now);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Prometheus metrics available at http://localhost:${PORT}/metrics`);
});


