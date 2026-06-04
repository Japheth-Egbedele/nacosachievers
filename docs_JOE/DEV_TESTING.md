# Dev & production smoke test — elections

Quick path to test onboarding + voting. For **deploying** Supabase + Render + Vercel + cron-job.org, follow [MANUAL_SETUP.md](./MANUAL_SETUP.md) (deployment overview at the top).

## Ports

| Service | Default | Env |
|---------|---------|-----|
| Backend | `3000` | `PORT` in `backend/.env` |
| Frontend | `3001` | Run `npm run dev -- -p 3001` in `frontend/` |

Set `FRONTEND_URL=http://localhost:3001` in backend `.env` for CORS.  
Set `NEXT_PUBLIC_API_URL=http://localhost:3000` in `frontend/.env.local`.

## Database

1. Run all SQL in [MANUAL_SETUP.md](./MANUAL_SETUP.md) including **§2.22 Elections**.
2. Seed super admin (§2.19).

## How student onboarding works

1. **Super admin** issues a PIN (Hub → **PINs**, or `POST /api/v1/admin/pins/generate`) for the student’s **matric number**.
2. **Student** opens `/hub/register` → enters matric + 8-character PIN → name, email, password.
3. Student **verifies email** (link from Resend, or `/hub/verify-email` with token).
4. Student **logs in** at `/hub/login` → can vote in **Elections** when an election is active.

Executives can manage **elections** but **cannot** generate PINs (super_admin only).

## Test accounts

### Admin (elections manager)

Use the seeded `super_admin` from §2.19 — log in at `/hub/login`.

### Member (voter)

1. Log in as super_admin → **PINs** in the nav (or dashboard).
2. Create a PIN:

```bash
curl -X POST http://localhost:3000/api/v1/admin/pins \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"matric_number":"CS/2023/001"}'
```

Save the **plaintext PIN** from the response (shown once).

3. Open `/hub/register` → enter matric + PIN → complete registration.
4. Verify email (Resend link, or dev SQL):

```sql
update users set is_email_verified = true where matric_number = 'CS/2023/001';
```

5. Log in as the new member.

## Election dry-run

1. As admin: `/hub/admin/elections` → create election (start = now, end = tomorrow).
2. Add candidates (positions e.g. President, Secretary).
3. As member: `/hub/elections` → open election → submit ballot.
4. Confirm second vote returns an error; results show counts.

## Health check

`GET http://localhost:3000/health`

## Production troubleshooting

### CORS: `Access-Control-Allow-Origin` mismatch

Browser shows origin `https://your-app.vercel.app` but header is `https://your-app.vercel.app/` → **trailing slash** on Render `FRONTEND_URL`.

**Fix:** Render → Environment → set `FRONTEND_URL` to `https://nacosachievers.vercel.app` (no `/` at end) → Save → Redeploy.

The API also strips trailing slashes on startup (after you deploy the latest backend).

### Login fails after CORS is fixed

- Super admin from §2.19: use the **email and password you hashed** into `password_hash`, not the Supabase dashboard password.
- `is_email_verified` must be `true` for that user row.
- Check Render logs if the API returns 401 vs 500.
