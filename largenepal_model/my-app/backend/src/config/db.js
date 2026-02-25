// // my-app/backend/src/config/db.js
// import pkg from "pg";
// import dotenv from "dotenv";

// dotenv.config();
// const { Pool } = pkg;

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT || 5432,
//   ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false
// });

// pool.on("connect", () => {
//   console.log("✅ PostgreSQL connected");
// });

// export default pool;


import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,                // connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL client connected');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.stack);
});

export default pool;