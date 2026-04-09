const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const pool = require("./db");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const ensureAdminUser = async () => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await pool.query(
    `INSERT INTO users (full_name, email, role, password_hash)
     VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       role = 'admin',
       password_hash = EXCLUDED.password_hash`,
    [ADMIN_FULL_NAME || "Administrador", ADMIN_EMAIL, passwordHash]
  );
};

app.post("/api/auth/admin/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, password_hash
       FROM users
       WHERE email = $1 AND role = 'admin'
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const admin = rows[0];
    const isValid = await bcrypt.compare(password, admin.password_hash || "");

    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.json({
      ok: true,
      user: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Login failed", details: error.message });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (error) {
    res.status(500).json({ ok: false, db: "disconnected", error: error.message });
  }
});

app.get("/api/places", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name, created_at FROM places ORDER BY name ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching places", details: error.message });
  }
});

app.post("/api/places", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO places (name) VALUES ($1) RETURNING id, name, created_at",
      [name]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Error creating place", details: error.message });
  }
});

app.get("/api/visits", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        v.id,
        v.school_name,
        v.students_count,
        v.visit_date,
        v.visit_time,
        v.status,
        p.id AS place_id,
        p.name AS place_name
      FROM visits v
      JOIN places p ON p.id = v.place_id
      ORDER BY v.visit_date ASC, v.visit_time ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching visits", details: error.message });
  }
});

app.post("/api/visits", async (req, res) => {
  const { school_name, students_count, visit_date, visit_time, place_id, status } = req.body;
  if (!school_name || !students_count || !visit_date || !visit_time || !place_id) {
    return res.status(400).json({
      error:
        "school_name, students_count, visit_date, visit_time and place_id are required",
    });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO visits (school_name, students_count, visit_date, visit_time, place_id, status)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'scheduled'))
       RETURNING id, school_name, students_count, visit_date, visit_time, place_id, status, created_at`,
      [school_name, students_count, visit_date, visit_time, place_id, status]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Error creating visit", details: error.message });
  }
});

ensureAdminUser()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize admin user:", error.message);
    process.exit(1);
  });
