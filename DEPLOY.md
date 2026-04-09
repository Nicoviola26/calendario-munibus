# Deploy online - Calendario MuniBus

## Recomendacion

Para este proyecto, la opcion mas simple y estable es:

- Backend + frontend juntos en **Render** (1 servicio web)
- Base de datos PostgreSQL en **Neon** (gratis y facil)

Esto evita mantener Docker en el servidor y deja todo con URL publica.

## 1) Subir proyecto a GitHub

1. Crear un repositorio nuevo en GitHub.
2. Subir este proyecto (sin `.env`, ya esta ignorado por `.gitignore`).

## 2) Crear base de datos en Neon

1. Ir a [https://neon.tech](https://neon.tech) y crear cuenta/proyecto.
2. Crear una base Postgres.
3. Copiar el `connection string` (empieza con `postgresql://...`).

## 3) Crear servicio en Render

1. Ir a [https://render.com](https://render.com).
2. New + > **Blueprint** (o Web Service conectado al repo).
3. Seleccionar tu repo.
4. Si usa blueprint, Render detecta `render.yaml` automaticamente.
5. Configurar variable de entorno:
   - `DATABASE_URL` = connection string de Neon

## 4) Inicializar esquema (tablas)

En Render, abrir Shell del servicio y ejecutar:

```bash
npm run db:init
```

Esto crea:

- `users`
- `places`
- `visits`

y carga lugares iniciales.

## 5) Verificar online

- `https://tu-app.onrender.com/api/health` debe devolver `{"ok":true,"db":"connected"}`
- Abrir:
  - `https://tu-app.onrender.com/admin-dashboard.html`
  - `https://tu-app.onrender.com/dashboard.html`

## 6) Notas importantes

- El plan free de Render "duerme" por inactividad (primer carga puede tardar).
- Si queres mas velocidad/estabilidad, usar plan pago en Render.
- Nunca subas `.env` al repo.
