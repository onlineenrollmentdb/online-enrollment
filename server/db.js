// server/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Keep the export name as 'db' for compatibility
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: {
    // Accept self-signed certificates from Aiven
    rejectUnauthorized: false
  }
});

module.exports = db;
