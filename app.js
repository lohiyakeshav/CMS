require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const authenticateToken = require("./middleware/authMiddleware");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Claims Management API",
      version: "1.0.0",
      description: "API documentation for the Claims Management System",
    },
    servers: [
      {
        url: "https://cms-2m4x.onrender.com",  // Cloud URL
      },
    ],
  },
  apis: ["./routes/*.js"], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Public routes
const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// Protected routes
const policyholderRoutes = require("./routes/policyholders");
const policyRoutes = require("./routes/policies");
const claimRoutes = require("./routes/claims");

app.use("/policyholders", authenticateToken, policyholderRoutes);
app.use("/policies", authenticateToken, policyRoutes);
app.use("/claims", authenticateToken, claimRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Claims Management System API is running!");
});

// Database connection
const { Pool } = require("pg");

// Use cloud database URL from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // Ensure DATABASE_URL is set in .env
  ssl: {
    rejectUnauthorized: false,  // For cloud SSL connections
  },
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error", err);
  } else {
    console.log("Connected to PostgreSQL:", res.rows[0]);
  }
});

// Server setup
if (process.env.NODE_ENV !== "test") {
  const PORT =  3000;
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Swagger docs available at https://cms-2m4x.onrender.com/api-docs`);
  });
  module.exports = { app, server };
} else {
  module.exports = { app };
}
