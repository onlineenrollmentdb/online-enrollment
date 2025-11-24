// test-db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const [rows] = await connection.execute('SELECT 1+1 AS result');
    console.log('DB Connection Success:', rows);
    await connection.end();
  } catch (err) {
    console.error('DB Connection Error:', err);
  }
}

test();
