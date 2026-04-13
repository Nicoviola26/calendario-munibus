const { Pool, neonConfig } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
const ws = require("ws");

dotenv.config();
neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  console.log("Testing SERVERLESS connection...");
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
