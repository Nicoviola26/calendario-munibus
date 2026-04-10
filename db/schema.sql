CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS places (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_place_id ON visits(place_id);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS place_id BIGINT REFERENCES places(id) ON DELETE SET NULL;

INSERT INTO places (name)
VALUES
  ('Museo Histórico Provincial'),
  ('Palacio Municipal'),
  ('Puerto de Santa Fe'),
  ('Manzana de las Luces'),
  ('Teatro Municipal')
ON CONFLICT (name) DO NOTHING;
