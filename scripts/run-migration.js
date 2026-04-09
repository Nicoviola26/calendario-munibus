const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const pool = require("../db");

dotenv.config();

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error("Usage: node scripts/run-migration.js <path-to-sql-file>");
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), migrationFile);

if (!fs.existsSync(absolutePath)) {
  console.error(`Migration file not found: ${absolutePath}`);
  process.exit(1);
}

const sql = fs.readFileSync(absolutePath, "utf8");

async function run() {
  try {
    await pool.query("BEGIN");
    await pool.query(sql);
    await pool.query("COMMIT");
    console.log(`Migration applied successfully: ${migrationFile}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
