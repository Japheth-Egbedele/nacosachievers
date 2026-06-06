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

1. Run all SQL in [MANUAL_SETUP.md](./MANUAL_SETUP.md) including **§2.6.1** (platform migrations), **§2.19.1** (staff role), and **§2.22 Elections**.
2. Seed super admin (§2.19).

## How hub onboarding works

### Students

1. **Super admin** or a delegated **PIN issuer** (`can_issue_pins`) issues a PIN for the student’s **ID number** (matric).
2. Student opens `/hub/register` → **Student** tab → ID number + 8-character PIN → name, email, password.
3. User **verifies email** (link from Resend, or `/hub/verify-email` with token).
4. User **logs in** at `/hub/login` → can vote in **Elections** when an election is active.

### Delegated PIN issuers

1. Super admin → **Admin → Members** → enable **Can issue PINs** on a trusted member (e.g. course rep).
2. That user sees **Issue PINs** in the Hub nav (PIN-only admin — not full executive access).
3. They can generate **student** PINs only. **Staff** PINs remain **super_admin only**.

Executives manage **elections** and the rest of admin; they do **not** get PIN access unless also granted `can_issue_pins` or they are super_admin.

## Staff / lecturer onboarding

Department staff and lecturers register with `role = staff` using a **work email + PIN** (not matric).

1. Run **MANUAL_SETUP §2.19.1** and **§2.6.1** in Supabase if not already applied.
2. **Super admin only** → **PINs** → **Staff** mode → enter **work email** → generate PIN.
3. Staff opens `/hub/register` → **Staff** tab → work email + PIN → name, password → verify email → can vote in elections.
4. Staff do **not** see Admin nav unless promoted to executive or granted PIN issuer separately.

**Not the same as:** vault **`lecturers`** (course roster) or CMS **`faculty_staff`** (About page) — those are separate directories, not hub logins.

### Staff test account (PIN flow)

```bash
curl -X POST http://localhost:3000/api/v1/admin/pins/generate \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"staff_email":"lecturer@achievers.edu.ng","level_of_entry":"staff"}'
```

After registration, confirm `users.role = staff` and the account can vote when email is verified.

## Profile & account deletion

- `/hub/profile` — edit display name, bio, socials; change password; upload photo.
- **Delete account** — requires current password; deactivates the user (`DELETE /users/me`).
- **Forgot password** — `/hub/forgot-password` → email link → `/hub/reset-password`.

## Test accounts

### Admin portal

Executives and super admins see **Admin** in the Hub nav (`/hub/admin`) — overview, members, vault, elections, wallet, CMS, audit log, etc.

**PINs** and **Settings** are **super_admin only** for staff PINs and site settings. Delegated issuers (`can_issue_pins`) see **Issue PINs** only.

### Admin (elections manager)

Use the seeded `super_admin` from §2.19 — log in at `/hub/login`.

### Member (voter)

**Option A — PIN flow**

1. Log in as super_admin → **Admin** → **PINs**.
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

**Option B — SQL mock voters (no Resend domain)**

Git Bash treats `!` inside double-quoted strings as history expansion. Use one of these to generate a bcrypt hash:

```bash
cd backend
set +H
node -e 'require("bcrypt").hash("TestPass123!", 12).then(h => console.log(h))'
```

Or run from **cmd.exe** / **PowerShell** (no `!` issue):

```powershell
cd backend
node -e "require('bcrypt').hash('TestPass123!', 12).then(h => console.log(h))"
```

Copy the printed hash, then in **Supabase → SQL Editor** (replace `PASTE_BCRYPT_HASH` and use unique matrics/emails):

```sql
insert into users (
  matric_number, email, password_hash, role,
  first_name, last_name, is_email_verified, academic_status
) values
  ('AU23AC5698', 'voter1@test.local', '$2b$12$fLIvhKLb8fszVWtchRBt/eiq37SkGX5hNGZuW1Rc.4B5gvTFvIbJ.', 'member', 'Test', 'Voter One', true, 'active'),
  ('AU23AC5690', 'voter2@test.local', '$2b$12$fLIvhKLb8fszVWtchRBt/eiq37SkGX5hNGZuW1Rc.4B5gvTFvIbJ.', 'member', 'Test', 'Voter Two', true, 'active'),
  ('AU23AC5640', 'voter3@test.local', '$2b$12$fLIvhKLb8fszVWtchRBt/eiq37SkGX5hNGZuW1Rc.4B5gvTFvIbJ.', 'member', 'Test', 'Voter Three', true, 'active');
```
TestPass123!

All three rows can share the same hash if they share the password `TestPass123!`. Log in at `/hub/login` with each email + that password.

## Election dry-run

1. As admin: `/hub/admin/elections` → create election (start = now, end = tomorrow).
2. Open **Manage** → **Setup** tab:
   - Add **positions** (e.g. President, Secretary).
   - Under each position, add **contestants** (two or more per race).
   - Leave **require all positions** checked so voters must pick one per post.
3. As a **student account** (member, staff, or executive — not super_admin): `/hub/elections` → open election → pick one contestant per position → **Review & submit ballot**.
4. Confirm second submit returns an error; **Results** tab appears only after the election is **completed** (not while voting is open).
5. Admin **Results & analytics** tab: NUESA-style report, extended analytics, share link at `/hub/elections/:id/results` (public, no login).

### Election detail returns 500

**Symptom:** List shows elections, but opening one fails (`500` on `/elections/:id` or `/admin/elections/:id`).

**Cause:** Production Supabase is missing the **position-first** election schema (`election_positions` table, `position_id` on candidates, refreshed `elections_with_status` view).

**Fix:** In Supabase → **SQL Editor**, run the full block in **MANUAL_SETUP §2.22.1** (Elections positions migration). It is safe to re-run (`if not exists` / `drop view if exists`).

After running, redeploy is **not** required — retry opening the election in the Hub.

## Health check

`GET http://localhost:3000/health`

## Production troubleshooting

### CORS: `Access-Control-Allow-Origin` mismatch

Browser origin must appear in Render **`FRONTEND_URL`** or **`CORS_ORIGINS`**.

| Symptom | Fix |
|---------|-----|
| Origin `https://www.nacosachievers.com.ng` but header is `https://nacosachievers.vercel.app` | Set `FRONTEND_URL=https://www.nacosachievers.com.ng` on Render → redeploy |
| Need Vercel URL + apex + www during transition | Add `CORS_ORIGINS=https://nacosachievers.vercel.app,https://nacosachievers.com.ng` |
| Trailing slash on URL | Strip trailing `/` from env values |

**Quick fix for your case (Render → Environment):**

```
FRONTEND_URL=https://www.nacosachievers.com.ng
CORS_ORIGINS=https://nacosachievers.vercel.app,https://nacosachievers.com.ng
```

Save → **Manual Deploy** on Render.

### Email verification

**Flow:** register → verification email → link opens verify page → **auto sign-in** → `/hub/elections`.

**Stuck without email**

1. Open `/hub/verify-email` → **Resend verification email** (email + password).
2. Wrong address? → **Update email and resend** (same password, new email).
3. Login with an unverified account redirects to verify page automatically.

Confirm Render `RESEND_FROM_EMAIL` uses your verified domain (e.g. `onboarding@nacosachievers.com.ng`).

### Login fails after CORS is fixed

- Super admin from §2.19: use the **email and password you hashed** into `password_hash`, not the Supabase dashboard password.
- `is_email_verified` must be `true` for that user row.
- Check Render logs if the API returns 401 vs 500.
