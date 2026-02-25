// my-app/backend/server.js
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import pool from "./src/config/db.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log(`✅ Server running on port ${PORT}`);
    console.log("✅ PostgreSQL connected");
  } catch (err) {
    console.error("❌ DB connection failed", err);
  }
});