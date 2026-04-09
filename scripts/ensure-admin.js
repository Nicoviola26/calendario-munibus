const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const pool = require("../db");

dotenv.config();

const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME || "Administrador";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function ensureAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const { rows } = await pool.query(
    `INSERT INTO users (full_name, email, role, password_hash)
     VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       role = 'admin',
       password_hash = EXCLUDED.password_hash
     RETURNING id, full_name, email, role`,
    [ADMIN_FULL_NAME, ADMIN_EMAIL, passwordHash]
  );

  return rows[0];
}

ensureAdmin()
  .then((adminUser) => {
    console.log("Admin user ready:", adminUser.email);
  })
  .catch((error) => {
    console.error("Failed to seed admin user:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
