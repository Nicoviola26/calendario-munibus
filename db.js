const { Pool, neonConfig } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
const ws = require("ws");

dotenv.config();

// Standard port 5432 is blocked, so we use WebSockets over port 443
neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000 
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

module.exports = pool;
