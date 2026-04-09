const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
