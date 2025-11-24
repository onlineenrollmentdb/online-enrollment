// server/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// If you have the Aiven CA certificate, you can paste its content in DB_CA_CERT
// in Render environment variables. Otherwise, rejectUnauthorized: false will skip SSL validation.
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_CA_CERT
    ? {
        ca: process.env.DB_CA_CERT,
        rejectUnauthorized: true
      }
    : {
        rejectUnauthorized: false
      }
});

module.exports = db;
