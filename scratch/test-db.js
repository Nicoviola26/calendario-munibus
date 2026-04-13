const { Pool } = require("pg");
require("dotenv").config();

const url = process.env.DATABASE_URL.split('?')[0] + "?sslmode=require";
const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  console.log("Testing connection to:", process.env.DATABASE_URL.split('@')[1]);
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Connection SUCCESS:", res.rows[0]);
  } catch (err) {
    console.error("Connection FAILED:", err.message);
  } finally {
    await pool.end();
  }
}

test();
