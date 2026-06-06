# NACOS Platform — Frontend Developer Handbook

| | |
|---|---|
| **Last updated** | **2026-06-04** |
| **Audience** | Next.js frontend developer |
| **Status** | Authoritative for routes, API contract, auth, and v1 scope |
| **Supersedes** | [docs_General/PRD.doc](../docs_General/PRD.doc) for anything added after PRD v1.0 (yearbook, careers, vault lecturers/materials) |
| **Backend spec** | [BUILD_PLAN.md](./BUILD_PLAN.md) — implementation phases (backend team) |
| **Infra setup** | [MANUAL_SETUP.md](./MANUAL_SETUP.md) — not required reading for FE unless debugging env |

> **Check `Last updated` before starting work.** If this date is older than your last pull, re-read §3 (API catalog) and §6 (new features).

---

## 1. Repo & environment

| Item | Value |
|------|--------|
| Frontend app | `/frontend` (Next.js, App Router) |
| Backend API | `/backend` (Express — phases 0–14) |
| FE env var | `NEXT_PUBLIC_API_URL` — e.g. `http://localhost:3000` (local) or `https://api.yourdomain.com` |
| Local CORS | Backend whitelists `FRONTEND_URL` only — coordinate exact origin (include port) with backend dev |

**Do not** use Supabase client or service role key in the frontend. All data goes through the REST API.

---

## 2. API conventions

**Base path:** `{NEXT_PUBLIC_API_URL}/api/v1`

### Response envelope

```typescript
// Success
{ success: true, data: T, message?: string }

// Paginated list
{ success: true, data: T[], meta: { total: number, page: number, limit: number } }

// Error
{ success: false, error: string, code?: string }
```

### Pagination

All list endpoints: `?page=1&limit=20` (default **20**, max **100**).

### HTTP status codes

`200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`, `500` — auth failures use generic messages (never “wrong password”).

### Auth (critical)

| Mechanism | Detail |
|-----------|--------|
| Access token | JWT in **response body** on login/refresh; send as `Authorization: Bearer <token>` |
| Refresh token | **httpOnly cookie** set by backend on login |
| Refresh | `POST /api/v1/auth/refresh` with **`credentials: 'include'`** |
| Logout | `POST /api/v1/auth/logout` with **`credentials: 'include'`** |

**All authenticated `fetch` calls** that may need refresh should use `credentials: 'include'` when hitting auth routes. Typical pattern: API client with Bearer header + global 401 handler that calls refresh then retries once.

### JWT payload (for UI gating only)

```typescript
{ sub: userId, role: UserRole, iat, exp }
```

Roles: `guest` (no token), `member`, `alumni`, `staff`, `executive`, `super_admin`.

### File handling

| Type | Pattern |
|------|---------|
| Profile / gallery / blog images | Public CDN URLs from API; append `?width=800&quality=80` when displaying |
| Vault PDFs, yearbook portraits/PDFs | **Never** construct Supabase URLs — call backend download/upload endpoints for **signed URLs** |
| Uploads | `multipart/form-data` to documented POST routes |

### Private file download flow

1. Call e.g. `GET /api/v1/vault/uploads/:id/download` or `GET /api/v1/yearbook/editions/:id/download`
2. Response includes short-lived signed URL (or redirect) — open/download immediately; do not cache URL long-term

---

## 3. Site map (pages & routes)

### Public marketing site

| Route | Purpose | Primary APIs |
|-------|---------|--------------|
| `/` | Home | CMS sections, events, blog, gallery, announcements, `yearbook_teaser` |
| `/about` | About | CMS, executives, `faculty_staff`, site_settings |
| `/pulse` | Events & news | `/events`, news endpoints |
| `/blog`, `/blog/:slug` | Blog | `/blog`, `/blog/:slug` |
| `/gallery` | Gallery | gallery list |
| `/contact` | Contact | CMS contact fields, `POST /contact` |
| `/yearbook` | Public yearbook list | `GET /yearbook/editions` (no auth) |
| `/yearbook/:id` | Edition detail + PDF download | `GET /yearbook/editions/:id`, `.../download` |
| `/careers` | Internships board | `GET /careers/postings` (no auth) |
| `/careers/:id` | Internship detail | `GET /careers/postings/:id` |

### The Hub (member portal)

| Route | Purpose | Auth |
|-------|---------|------|
| `/hub` | Hub teaser | Public |
| `/hub/login`, `/hub/register`, `/hub/forgot-password`, `/hub/reset-password`, `/hub/verify-email` | Auth flows | Public |
| `/hub/dashboard` | Dashboard | Member+ |
| `/hub/vault` | Vault browse/upload | Member+ |
| `/hub/vault/courses/:id` | Course detail (lecturers, materials, past questions) | Member+ |
| `/hub/wallet` | Credits | Member+ |
| `/hub/marketplace` | Redeem items | Member+ |
| `/hub/events`, `/hub/events/:id` | RSVP | Member+ |
| `/hub/alumni` | Alumni directory | Member+ |
| `/hub/messages` | DMs | Member+ |
| `/hub/notifications` | Notifications | Member+ |
| `/hub/profile` | Profile & settings | Member+ |
| `/hub/yearbook` | Submit yearbook slot | Member+ (while edition open) |
| `/hub/careers/submit` | Submit internship | Member+ |
| `/hub/careers/mine` | My submissions | Member+ |
| `/hub/elections`, `/hub/elections/:id` | Chapter elections & ballot | Member+ (verified email) |
| `/hub/elections/:id/results` | Public shareable results (completed elections only) | Public |
| `/hub/admin` | Admin overview | `executive` or `super_admin` |
| `/hub/admin/pins` | Issue onboarding PINs | `super_admin` or `can_issue_pins` |
| `/hub/admin/audit` | Security audit log | `executive` or `super_admin` |
| `/hub/admin/elections` | Manage elections & candidates | `executive` or `super_admin` |
| `/hub/admin/*` | Other admin modules | `executive` or `super_admin` |

**Minimal launch:** public `/` is coming-soon; build Hub auth + elections first — see [DEV_TESTING.md](./DEV_TESTING.md).

**PIN issuers:** Members with `can_issue_pins = true` (set by super admin on **Members**) see **Issue PINs** only — not full admin. Staff PINs require super admin.

**Note:** `faculty_staff` (About page) and `lecturers` (Vault course roster) are **different data** — do not merge in UI.

---

## 4. API catalog

Legend: **Public** = no Bearer token · **Auth** = member+ · **Admin** = executive or super_admin (noted where stricter).

### Health

| Method | Path | Access |
|--------|------|--------|
| GET | `/health` | Public |

### Auth

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | `/auth/validate-pin` | Public | Step 1 register; returns one-time token |
| POST | `/auth/register` | Public | Requires PIN step token |
| POST | `/auth/verify-email` | Public | |
| POST | `/auth/login` | Public | Sets refresh cookie |
| POST | `/auth/refresh` | Cookie | `credentials: 'include'` |
| POST | `/auth/logout` | Cookie | |
| POST | `/auth/forgot-password` | Public | Always 200 |
| POST | `/auth/reset-password` | Public | |

### Users & profile

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/users/me` | Auth | Includes **`unread_notifications_count`**, **`unread_messages_count`**, wallet balance |
| PATCH | `/users/me` | Auth | display_name, bio, socials, notification_prefs |
| PATCH | `/users/me/password` | Auth | |
| DELETE | `/users/me` | Auth | Body: `{ password }` — deactivates account |
| POST | `/users/me/photo` | Auth | multipart → public-images |
| DELETE | `/users/me/photo` | Auth | |
| GET | `/users/:id/profile` | Public/Auth | Respects visibility |
| GET | `/users/alumni` | Auth | Paginated, filterable |
| GET | `/users/leaderboard` | Auth | Vault contributors |

### Yearbook (member)

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| POST | `/users/me/yearbook/portrait` | Auth | multipart → yearbook-portraits |
| PATCH | `/users/me/yearbook` | Auth | Only while edition `submissions_open` and `status ≠ published`; body: `display_name`, `portrait_url`, `quote`, optional `edition_id` |

### Vault

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/vault/courses` | Auth | Filters: department, level, semester, search |
| GET | `/vault/courses/:id` | Auth | Lecturers + uploads by `upload_kind` |
| POST | `/vault/uploads` | Auth | PDF multipart; optional `upload_kind`: `past_question` \| `course_material` |
| GET | `/vault/uploads` | Auth | Approved only; filter incl. `upload_kind` |
| GET | `/vault/uploads/mine` | Auth | |
| GET | `/vault/uploads/:id/download` | Auth | Signed URL ~1hr |
| DELETE | `/vault/uploads/:id` | Auth | Owner or admin |
| POST | `/vault/uploads/:id/flag` | Auth | |

### Wallet

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/wallet/balance` | Auth | |
| GET | `/wallet/transactions` | Auth | Paginated; filter by `type` |
| POST | `/wallet/transfer` | Auth | remark min 3 chars; recipient search UI uses members/alumni list |

### Marketplace, Events, CMS, Blog, etc. — see BUILD_PLAN Phases 5–7

| Area | Key public routes |
|------|-------------------|
| Marketplace | `GET /marketplace/items`, `POST /marketplace/redeem`, `GET /marketplace/orders/mine` |
| Events | `GET /events`, `GET /events/:id`, `POST /events/:id/rsvp`, `DELETE /events/:id/rsvp` |
| CMS | `GET /cms/:sectionKey` — keys include `yearbook_teaser`, hero, about, cyberspace, etc. |
| Blog | `GET /blog`, `GET /blog/:slug` |
| Contact | `POST /contact` |
| Subscribe | `POST /subscribe` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| Messages | `GET /messages/conversations`, `POST .../send`, etc. |

### Yearbook (public)

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/yearbook/editions` | **Public** | `status = published` AND `cohort_alumni_unlocked_at ≤ now()` |
| GET | `/yearbook/editions/:id` | **Public** | 404 if not visible |
| GET | `/yearbook/editions/:id/download` | **Public** | Rate limited; may return **202** while `pdf_build_status` is building |

### Careers (public + member)

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/careers/postings` | **Public** | Verified, not expired; filter `work_mode`, `location` |
| GET | `/careers/postings/:id` | **Public** | |
| POST | `/careers/postings` | Auth | Internships only; max 3/user/24h |
| GET | `/careers/postings/mine` | Auth | |

### Admin (executive / super_admin unless noted)

Grouped by portal section — full list in [BUILD_PLAN.md](./BUILD_PLAN.md) Phases 1, 3, 5–6, 10, 12–13.

Highlights for FE admin UI:

- **PINs** — `super_admin` or delegated `can_issue_pins` (student PINs only unless super_admin); staff PINs use work email
- **Members** — role/status; super_admin toggles **Can issue PINs**
- **Audit log** — `GET /admin/audit-logs` (requires MANUAL_SETUP §2.6.1)
- Analytics, settings (`super_admin` for settings)
- Vault pending queue, course CRUD, lecturer CRUD, teaching assignments
- Elections — live stats polling; NUESA-style results report + public share URL
- Yearbook editions, slots, rebuild PDF
- Careers verification queue
- Marketplace, events, CMS `PUT`, blog CRUD, gallery, faculty_staff, announcements

### Elections (member + public)

| Method | Path | Access | Notes |
|--------|------|--------|-------|
| GET | `/elections/:id/public-results` | **Public** | Only when election `status = completed`; no auth |

---

## 5. Enums (display labels)

Use backend string values exactly in API calls.

### Roles
`super_admin` · `executive` · `member` · `alumni` · `staff` · `guest`

### Vault
- **upload_status:** `pending` · `approved` · `rejected`
- **upload_kind:** `past_question` · `course_material`

### Lecturers (course detail)
- **employment_type:** `full_time` · `part_time` · `adjunct` · `visiting` · `external`
- **teaching_status:** `active` · `on_sabbatical` · `on_leave` — show honestly in UI (e.g. badge “On sabbatical” for session)

### Yearbook
- **yearbook_edition_status:** `draft` · `published` · `archived`
- **pdf_build_status:** `none` · `building` · `ready` · `failed` (expect from API when polling download)

### Careers
- **career_posting_status:** `draft` · `pending_verification` · `verified` · `rejected` · `expired`
- **work_mode:** `onsite` · `remote` · `hybrid`

### Wallet transaction types (history filters)
`credit` · `debit` · `transfer_in` · `transfer_out` · `redemption` · `upload_reward` · `career_submission_bounty`

### Notification types
`vault_approved` · `vault_rejected` · `credit_received` · `transfer` · `order_update` · `announcement` · `message` · `event_reminder` · `career_verified` · `career_rejected` · `yearbook_published`

---

## 6. Feature notes (v1)

### Yearbook
- **Public** on homepage/marketing once edition is **published** and **`cohort_alumni_unlocked_at`** has passed — **no Hub login** required to view/download.
- CMS block: `GET /cms/yearbook_teaser` for copy/CTA on Home.
- Members **manually** enter quote/photo in Hub — not auto-synced from profile.
- Slot **locks** when admin sets edition to **published**; admin can still edit slots after.
- PDF download: handle loading state if API returns building status.

### Careers
- **Internships only** in v1 (no full-time job board, no alumni attestation).
- Submissions start as `pending_verification`; only `verified` appear on public list.
- Bounty credits optional — controlled by site setting `career_submission_bounty_credits` (0 = disabled).

### Vault
- Upload form: let user pick **Past questions** vs **Course materials** (`upload_kind`).
- Course detail page: show lecturers for **current session** with employment/teaching badges; list materials and past questions separately.

---

## 7. CMS section keys (seed / admin)

| Key | Use |
|-----|-----|
| `yearbook_teaser` | Home page yearbook block |
| Hero, about, cyberspace, contact | Per PRD / admin CMS (keys as implemented in backend) |

Fetch: `GET /api/v1/cms/{sectionKey}` → `content` is JSON object.

---

## 8. Suggested FE architecture

```
frontend/
  lib/api/client.ts       # base URL, envelope parse, auth header
  lib/api/auth.ts         # login, refresh, logout (credentials)
  lib/hooks/useAuth.ts
  types/api.ts            # mirror enums + response types
```

- **Server Components:** public CMS, blog, events, yearbook list (no secrets).
- **Client Components:** Hub, forms, uploads, polling (notifications/messages).
- **Role guard:** read `role` from JWT or `/users/me` for `/hub/admin` layout.

---

## 9. Backend availability (build order)

Frontend can mock until API exists; integrate in this order:

| Phase | FE can build |
|-------|----------------|
| 0–1 | Auth pages, API client |
| 2 | Profile, `/users/me` navbar badges |
| 7 | **Most marketing site** (CMS, blog, gallery, contact) |
| 6 | Events on Pulse + Hub |
| 3 | Vault |
| 4–5 | Wallet, marketplace |
| 8–9 | Notifications, messages |
| 10 | Admin portal |
| 12 | Yearbook public + Hub submission |
| 13 | Careers public + submit + admin verify |

Confirm with backend dev which phase is deployed on `NEXT_PUBLIC_API_URL`.

---

## 10. Out of scope (v1)

- Native mobile app
- Payments / dues
- Mentorship matching
- Next-semester course recommendation AI
- Yearbook groups / superlatives pages
- Full-time job postings on career board

---

## 11. Who to ask

| Topic | Doc |
|-------|-----|
| API behavior / new endpoints | This handbook → then BUILD_PLAN |
| DB tables / buckets | MANUAL_SETUP.md |
| Code style (backend) | cursorrules.md |

When backend behavior changes, **`Last updated`** at the top of this file must be bumped.
