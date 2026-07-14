
  # AY Prayerbox Mobile App UI

  This is a code bundle for AY Prayerbox Mobile App UI. The original project is available at https://www.figma.com/design/SVaqoS4ifLKYkTt1UadIBy/AY-Prayerbox-Mobile-App-UI.

  ## Running the code

  Run `npm i` to install the dependencies.

  Copy `.env.example` to `.env` and set production values.

  Run `npm run api` to start the backend API on http://localhost:4000.

  Run `npm run db:backup` to create a manual backup.
  Run `npm run db:restore` with `BACKUP_FILE` set in environment to restore a backup.

  In another terminal, run `npm run dev` to start the frontend development server.

  Backend data is stored in `server/data.sqlite` after the API starts.
  On first run, the API migrates legacy data from `server/data.json` if present.
  User passwords are stored as secure scrypt hashes, and legacy plain-text passwords are auto-migrated on startup.

  ## Admin Login (Development)

  Default admin credentials:
  - Email: `prayerbox@gmail.com`
  - Password: `admin123`

  These are enforced by the fixed admin account on API startup and can be changed in `.env`:
  - `FIXED_ADMIN_ENABLED`
  - `FIXED_ADMIN_EMAIL`
  - `FIXED_ADMIN_PASSWORD`

  ## Production Checklist

  1. Set `NODE_ENV=production`.
  2. Set a strong `SESSION_SECRET`.
  3. Configure short-lived access and longer-lived refresh tokens (`AUTH_ACCESS_TOKEN_TTL_SECONDS`, `AUTH_REFRESH_TOKEN_TTL_SECONDS`).
  4. Set backup options (`BACKUP_DIR`, `BACKUP_RETENTION_COUNT`, and optional `BACKUP_INTERVAL_MINUTES`).
  5. Set `ALLOWED_ORIGINS` to your frontend domain(s), comma-separated.
  6. Set `ADMIN_EMAILS` for accounts that can moderate/delete content.
  7. Persist the SQLite file (`DB_FILE`) on durable storage.
  8. Serve the API behind HTTPS.

  ## Security Behaviors

  - Access token + refresh token sessions are used for authenticated operations.
  - Session refresh is available at `/api/auth/refresh`; revocation is available at `/api/auth/logout`.
  - Session management is available at `/api/auth/sessions`, `/api/auth/sessions/:id`, and `/api/auth/logout-all`.
  - `/api/auth/register` and `/api/auth/login` are rate-limited.
  - Admin-only operations: `/api/users`, prayer/testimony moderation/deletes.
  - Admin audit trail is available at `/api/admin/audit-logs`.
  - Manual backup endpoint is available at `/api/admin/backup`.
  - `/api/state` only includes users for admin-authenticated requests.
  - Security headers are applied on API responses.
  
