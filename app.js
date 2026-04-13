const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const pool = require("./db");

dotenv.config();

const app = express();
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

const ensureTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS places (
      id BIGSERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      password_hash TEXT,
      place_id BIGINT REFERENCES places(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS visits (
      id BIGSERIAL PRIMARY KEY,
      school_name TEXT NOT NULL,
      students_count INT NOT NULL CHECK (students_count > 0),
      visit_date DATE NOT NULL,
      visit_time TIME NOT NULL,
      place_id BIGINT NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
      created_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
};

const ensureUsersPlaceColumn = async () => {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS place_id BIGINT REFERENCES places(id) ON DELETE SET NULL
  `);
};

const ensurePlacesColumns = async () => {
  await pool.query(`
    ALTER TABLE places
    ADD COLUMN IF NOT EXISTS image_url TEXT;
  `);
};

const ensureAdminUser = async () => {
  await ensureTables();
  await ensureUsersPlaceColumn();
  await ensurePlacesColumns();

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

  const fallbackAdminLogin = () => {
    if (
      ADMIN_EMAIL &&
      ADMIN_PASSWORD &&
      String(email).trim().toLowerCase() === String(ADMIN_EMAIL).trim().toLowerCase() &&
      String(password) === String(ADMIN_PASSWORD)
    ) {
      return res.json({
        ok: true,
        user: {
          id: 0,
          full_name: ADMIN_FULL_NAME || "Administrador",
          email: ADMIN_EMAIL,
          role: "admin",
        },
      });
    }
    return res.status(401).json({ error: "Invalid credentials" });
  };

  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, password_hash
       FROM users
       WHERE email = $1 AND role = 'admin'
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return fallbackAdminLogin();
    }

    const admin = rows[0];
    const isValid = await bcrypt.compare(password, admin.password_hash || "");

    if (!isValid) {
      return fallbackAdminLogin();
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
    return fallbackAdminLogin();
  }
});

app.post("/api/auth/user/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "username and password are required" });
  }

  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.place_id, u.password_hash, p.name AS place_name
       FROM users u
       LEFT JOIN places p ON p.id = u.place_id
       WHERE lower(u.email) = lower($1) AND u.role = 'user'
       LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash || "");
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.json({
      ok: true,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.email,
        role: user.role,
        place_id: user.place_id,
        place_name: user.place_name,
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
      "SELECT id, name, image_url, created_at FROM places ORDER BY name ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching places", details: error.message });
  }
});

app.post("/api/places", async (req, res) => {
  const { name, image_url } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO places (name, image_url) VALUES ($1, $2) RETURNING id, name, image_url, created_at",
      [name, image_url]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Error creating place", details: error.message });
  }
});

app.put("/api/places/:id", async (req, res) => {
  const placeId = Number(req.params.id);
  const { name, image_url } = req.body;

  if (!placeId || !name) {
    return res.status(400).json({ error: "id and name are required" });
  }

  try {
    const { rows } = await pool.query(
      "UPDATE places SET name = $1, image_url = $2 WHERE id = $3 RETURNING id, name, image_url, created_at",
      [name, image_url, placeId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Place not found" });
    }
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Error updating place", details: error.message });
  }
});

app.delete("/api/places/:id", async (req, res) => {
  const placeId = Number(req.params.id);
  if (!placeId) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    const linkedVisits = await pool.query(
      "SELECT COUNT(*)::int AS total FROM visits WHERE place_id = $1",
      [placeId]
    );
    if ((linkedVisits.rows[0]?.total || 0) > 0) {
      return res.status(409).json({
        error: "Place has linked visits and cannot be deleted",
      });
    }

    const { rowCount } = await pool.query("DELETE FROM places WHERE id = $1", [placeId]);
    if (!rowCount) {
      return res.status(404).json({ error: "Place not found" });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Error deleting place", details: error.message });
  }
});

app.get("/api/users", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, email, role, place_id, created_at
       FROM users
       WHERE role = 'user'
       ORDER BY full_name ASC`
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ error: "Error fetching users", details: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  const { username, password, place_id, full_name } = req.body;
  if (!username || !password || !place_id) {
    return res.status(400).json({ error: "username, password and place_id are required" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const displayName = full_name?.trim() || username.trim();
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, email, role, place_id, password_hash)
       VALUES ($1, $2, 'user', $3, $4)
       RETURNING id, full_name, email, role, place_id, created_at`,
      [displayName, username.trim(), Number(place_id), passwordHash]
    );
    return res.status(201).json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Error creating user", details: error.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const { username, password, place_id, full_name } = req.body;
  if (!userId || !username || !place_id) {
    return res.status(400).json({ error: "id, username and place_id are required" });
  }

  try {
    const displayName = full_name?.trim() || username.trim();
    if (password) {
      const passwordHash = await bcrypt.hash(password, 12);
      const { rows } = await pool.query(
        `UPDATE users
         SET full_name = $1, email = $2, place_id = $3, password_hash = $4
         WHERE id = $5 AND role = 'user'
         RETURNING id, full_name, email, role, place_id, created_at`,
        [displayName, username.trim(), Number(place_id), passwordHash, userId]
      );
      if (!rows.length) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json(rows[0]);
    }

    const { rows } = await pool.query(
      `UPDATE users
       SET full_name = $1, email = $2, place_id = $3
       WHERE id = $4 AND role = 'user'
       RETURNING id, full_name, email, role, place_id, created_at`,
      [displayName, username.trim(), Number(place_id), userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Error updating user", details: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "id is required" });
  }

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM users WHERE id = $1 AND role = 'user'",
      [userId]
    );
    if (!rowCount) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Error deleting user", details: error.message });
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

app.put("/api/visits/:id", async (req, res) => {
  const visitId = Number(req.params.id);
  const { school_name, students_count, visit_date, visit_time, place_id, status } = req.body;

  if (!visitId) return res.status(400).json({ error: "visit id is required" });

  try {
    const { rows } = await pool.query(
      `UPDATE visits 
       SET school_name = COALESCE($1, school_name),
           students_count = COALESCE($2, students_count),
           visit_date = COALESCE($3, visit_date),
           visit_time = COALESCE($4, visit_time),
           place_id = COALESCE($5, place_id),
           status = COALESCE($6, status)
       WHERE id = $7
       RETURNING id, school_name, students_count, visit_date, visit_time, place_id, status`,
      [school_name, students_count, visit_date, visit_time, place_id, status, visitId]
    );

    if (!rows.length) return res.status(404).json({ error: "Visit not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Error updating visit", details: error.message });
  }
});

app.delete("/api/visits/:id", async (req, res) => {
  const visitId = Number(req.params.id);
  if (!visitId) return res.status(400).json({ error: "visit id is required" });

  try {
    const { rowCount } = await pool.query("DELETE FROM visits WHERE id = $1", [visitId]);
    if (rowCount === 0) return res.status(404).json({ error: "Visit not found" });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Error deleting visit", details: error.message });
  }
});

module.exports = {
  app,
  ensureAdminUser,
};
