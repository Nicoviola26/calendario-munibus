# Base de datos - Calendario MuniBus

## 1) Requisitos

- Node.js 18+
- Docker Desktop

## 2) Crear archivo de entorno

1. Copiar `.env.example` como `.env`
2. Ajustar `DATABASE_URL` si corresponde

## 3) Levantar PostgreSQL local

```bash
docker compose up -d
```

## 4) Crear tablas y datos iniciales

```bash
npm run db:init
```

Esto ejecuta `db/schema.sql`.

## 5) Levantar backend

```bash
npm run dev
```

Servidor API: `http://localhost:3000`

## 6) Endpoints base disponibles

- `GET /api/health` -> estado API + DB
- `GET /api/places` -> lista de lugares
- `POST /api/places` -> crear lugar
- `GET /api/visits` -> lista de visitas
- `POST /api/visits` -> crear visita

## 7) Ejemplo rápido para crear visita

```bash
curl -X POST http://localhost:3000/api/visits ^
  -H "Content-Type: application/json" ^
  -d "{\"school_name\":\"Escuela Normal N° 32\",\"students_count\":30,\"visit_date\":\"2026-04-10\",\"visit_time\":\"09:30\",\"place_id\":1}"
```

## Deploy online

Para dejarlo en internet (web + DB), segui `DEPLOY.md`.
