# Deploy online - Calendario MuniBus (Netlify + Neon)

## Recomendacion

Para este proyecto, una opcion simple es:

- Frontend + API (Function) en **Netlify**
- Base de datos PostgreSQL en **Neon** (gratis y facil)

## 1) Subir proyecto a GitHub

1. Crear un repositorio nuevo en GitHub.
2. Subir este proyecto (sin `.env`, ya esta ignorado por `.gitignore`).

## 2) Crear base de datos en Neon

1. Ir a [https://neon.tech](https://neon.tech) y crear cuenta/proyecto.
2. Crear una base Postgres.
3. Copiar el `connection string` (empieza con `postgresql://...`).

## 3) Crear sitio en Netlify

1. Ir a [https://app.netlify.com](https://app.netlify.com).
2. **Add new site** > **Import an existing project**.
3. Conectar el repo y desplegar con estos valores:
   - Build command: *(vacio)*
   - Publish directory: `.`
4. Netlify detecta `netlify.toml` y publica los archivos estaticos + Function de API.
5. Configurar variables de entorno en Site settings > Environment variables:
   - `DATABASE_URL` = connection string de Neon
   - `ADMIN_EMAIL` = correo del admin inicial
   - `ADMIN_PASSWORD` = password del admin inicial
   - `ADMIN_FULL_NAME` = nombre visible (opcional)

## 4) Inicializar esquema (tablas)

Ejecutar en tu maquina local (apuntando a Neon):

```bash
npm run db:init
```

Esto crea `users`, `places` y `visits` (y carga lugares iniciales).

## 5) Verificar online

- `https://tu-sitio.netlify.app/api/health` debe devolver `{"ok":true,"db":"connected"}`
- Abrir:
  - `https://tu-sitio.netlify.app/admin-dashboard.html`
  - `https://tu-sitio.netlify.app/dashboard.html`

## 6) Notas importantes

- No subas `.env` al repo.
- En Netlify, los endpoints de API se resuelven via redirect de `netlify.toml`.
- Si cambias variables de entorno, redeploy para aplicar cambios.
