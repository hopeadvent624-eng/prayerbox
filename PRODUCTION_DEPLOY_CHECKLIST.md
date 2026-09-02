# AY Prayerbox Production Deploy Checklist

Use this checklist when deploying the frontend (Netlify) and backend (Render) so admin credentials and auth behavior match local development.

## 1) Backend (Render) - Required Environment Variables

Set these in your Render service:

- `NODE_ENV=production`
- `PORT=4000` (or your Render-assigned port handling)
- `SESSION_SECRET=<long-random-secret>`
- `AUTH_ACCESS_TOKEN_TTL_SECONDS=1800`
- `AUTH_REFRESH_TOKEN_TTL_SECONDS=1209600`
- `ALLOWED_ORIGINS=https://<your-netlify-site>.netlify.app`
- `ADMIN_EMAILS=prayerbox@gmail.com,asher@gmail.com,bluelinq.admin@gmail.com`
- `FIXED_ADMIN_ENABLED=true`
- `FIXED_ADMIN_EMAIL=prayerbox@gmail.com`
- `FIXED_ADMIN_PASSWORD=<strong-random-admin-password>`
- `DB_FILE=server/data.sqlite` (or your persistent disk path)
- `BACKUP_DIR=server/backups`
- `BACKUP_RETENTION_COUNT=14`
- `BACKUP_INTERVAL_MINUTES=60`

Notes:

- `ADMIN_EMAILS` controls who has admin role.
- `FIXED_ADMIN_*` guarantees one known admin account exists after startup.
- Use persistent disk/storage for SQLite in production.
- Set `BACKUP_INTERVAL_MINUTES` to a positive value and verify backup files are retained.
- Production startup rejects the default admin password, missing session secret, or missing CORS origins.

## 2) Backend Code Version Alignment

Ensure Render is running the same backend version as local.

Confirm these features exist in deployed backend:

- `role` support on users
- fixed admin account sync on startup
- modern auth response including role metadata

If Render is behind local code:

- push latest backend changes
- redeploy Render service

## 3) Frontend (Netlify) - API Routing

Your current [netlify.toml](netlify.toml) proxies API requests to:

- `https://prayerbox-api.onrender.com/api/:splat`

This is valid if Render is your backend source of truth.

Also set Netlify env vars:

- `VITE_API_BASE_URL=` (empty if using Netlify `/api/*` redirect)
- `VITE_ADMIN_EMAILS=prayerbox@gmail.com,asher@gmail.com,bluelinq.admin@gmail.com`

Then trigger a fresh Netlify build/deploy.

## 4) Production Admin Account Verification

After deploy, verify on production API:

1. Login with each admin email.
2. Confirm API response user has admin access (role/admin allow-list logic).
3. Confirm admin user lands on admin dashboard in frontend.

Suggested accounts:

- `prayerbox@gmail.com / <configured-production-password>`
- `asher@gmail.com / <configured-production-password>`
- `bluelinq.admin@gmail.com / <configured-production-password>`

If an account fails online but works locally:

- Render DB likely does not contain that user yet, or
- Render env (`ADMIN_EMAILS`) does not include that email.

## 5) One-Time Production Data Sync

If needed, create missing admin users on production backend by registering them through the live app/API, then ensure their emails are in `ADMIN_EMAILS`, then restart/redeploy backend so role sync runs.

## 6) Final Smoke Test

Run these checks on the live site:

- Normal user login works
- Admin login through normal login page opens admin dashboard
- Admin cannot submit prayers/testimonies
- Admin moderation actions work
- Logout/login cycle preserves correct role behavior

## 7) Common Failure Pattern

Symptom:

- local works, online fails with "Invalid email or password" or "no admin access"

Cause:

- frontend deployed to Netlify points to Render backend with different DB/env than local

Fix:

- align Render env vars + deployed backend version + production database users
