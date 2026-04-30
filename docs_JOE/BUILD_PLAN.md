# NACOS Backend — Build Plan

All phases are backend only (Node.js + Express + Supabase).
Frontend (Next.js) is a separate repository and developer.

---

## Phase 0 — Project Scaffold

**Cursor handles:**
- Initialize Node.js + TypeScript project
- Install all dependencies (see list below)
- Configure `tsconfig.json`, `eslint`, `.prettierrc`
- Create full folder structure per `.cursorrules`
- Create `app.ts` (Express setup, middleware mount, global error handler)
- Create `server.ts` (HTTP server startup with graceful shutdown)
- Create env validation module (`/src/config/env.ts`) — crashes on missing vars
- Create Supabase client singleton (`/src/config/supabase.ts`)
- Create Resend client (`/src/config/resend.ts`)
- Create logger (Pino, JSON format) (`/src/config/logger.ts`)
- Create `catchAsync` wrapper utility
- Create custom error classes (`AppError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `ValidationError`)
- Create global error handler middleware
- Create `/health` endpoint (returns 200, lightweight DB ping)
- Create response helper (`/src/utils/response.ts`) — success/error envelope

**Dependencies to install:**
```
express helmet cors express-rate-limit
@supabase/supabase-js
jsonwebtoken bcrypt
zod
pino pino-http
resend
multer
uuid
date-fns
typescript ts-node tsx
@types/express @types/node @types/bcrypt @types/jsonwebtoken @types/multer
eslint prettier
```

**You handle (MANUAL_SETUP.md):**
- Supabase project creation
- All DB table creation (SQL in MANUAL_SETUP.md)
- Storage bucket creation
- Environment variables

---

## Phase 1 — Authentication System

**Cursor handles:**

### 1.1 PIN Onboarding
- `POST /api/v1/auth/validate-pin` — validates matric + PIN, returns a short-lived one-time session token to proceed to registration
- `POST /api/v1/admin/pins/generate` — super_admin only, generates PIN for a matric number, bcrypt hashes it, stores with metadata
- `POST /api/v1/admin/pins/invalidate/:id` — super_admin only, invalidates unexpired PIN

### 1.2 Registration & Verification
- `POST /api/v1/auth/register` — requires valid one-time token from PIN step, creates user, sends verification email via Resend
- `POST /api/v1/auth/verify-email` — validates token, marks user verified

### 1.3 Login & Session
- `POST /api/v1/auth/login` — validates credentials, returns access token (body) + refresh token (httpOnly cookie)
- `POST /api/v1/auth/refresh` — validates refresh token cookie, rotates token (invalidate old, issue new)
- `POST /api/v1/auth/logout` — revokes refresh token

### 1.4 Password Recovery
- `POST /api/v1/auth/forgot-password` — generates reset token, sends email (always returns 200 — no enumeration)
- `POST /api/v1/auth/reset-password` — validates token, updates password, revokes all refresh tokens for user

### Services & Utilities
- `token.service.ts` — JWT sign/verify (RS256), refresh token generation, hashing, rotation logic
- `pin.service.ts` — PIN generation (crypto.randomBytes), bcrypt hashing, validation
- `email.service.ts` — Resend templates for: verification, password reset, welcome, vault approval, credit received, order update
- Rate limiters for all auth routes
- `authMiddleware.ts` — verifies JWT, attaches `req.user`
- `roleGuard.ts` — factory middleware `requireRole(...roles)`

---

## Phase 2 — User Profiles & Settings

**Cursor handles:**
- `GET /api/v1/users/me` — own profile
- `PATCH /api/v1/users/me` — update display name, bio, social links, notification preferences
- `PATCH /api/v1/users/me/password` — change password (requires current password)
- `POST /api/v1/users/me/photo` — upload profile photo (multipart, Supabase public bucket)
- `DELETE /api/v1/users/me/photo` — delete profile photo, remove from storage
- `GET /api/v1/users/:id/profile` — public profile view (respects visibility settings)
- `GET /api/v1/users/alumni` — alumni directory (members + alumni role, paginated, filterable)
- `GET /api/v1/users/leaderboard` — top vault contributors (by approved upload count and credits earned)

---

## Phase 3 — The Vault

**Cursor handles:**

### Courses
- `GET /api/v1/vault/courses` — list all courses (filterable: department, level, semester, search)
- `POST /api/v1/vault/courses` — executive/admin only, add course
- `PATCH /api/v1/vault/courses/:id` — executive/admin only
- `DELETE /api/v1/vault/courses/:id` — executive/admin only

### Uploads
- `POST /api/v1/vault/uploads` — member upload (multipart PDF), stores to private bucket, status: pending
- `GET /api/v1/vault/uploads` — list approved uploads (paginated, filterable: course, level, semester, search)
- `GET /api/v1/vault/uploads/mine` — own uploads with status
- `GET /api/v1/vault/uploads/:id/download` — generates signed URL (1hr), increments download count
- `DELETE /api/v1/vault/uploads/:id` — uploader or admin only, deletes DB record + storage file

### Moderation
- `GET /api/v1/vault/pending` — executive/admin only, pending uploads queue
- `PATCH /api/v1/vault/uploads/:id/review` — executive/admin: approve (award credits, notify) or reject (with reason, notify)
- `POST /api/v1/vault/uploads/:id/flag` — member, flag with reason
- `GET /api/v1/vault/flags` — executive/admin, view flags
- `PATCH /api/v1/vault/flags/:id/resolve` — executive/admin, resolve flag

### Vault Service Logic
- On approval: check `credits_awarded` flag, award configured credits, insert wallet transaction, send notification + email
- On rejection: notify uploader with reason
- File validation: check PDF magic bytes (`%PDF-`) before any processing

---

## Phase 4 — Wallet & Transfers

**Cursor handles:**
- `GET /api/v1/wallet/balance` — own balance
- `GET /api/v1/wallet/transactions` — own transaction history (paginated, filterable by type)
- `POST /api/v1/wallet/transfer` — transfer credits to another member
  - Validate: recipient exists and is active, amount > 0, sender has sufficient balance, remark required (min 3 chars), transfer amount ≤ site setting max, cooldown check
  - Atomic DB operation: debit sender + credit receiver + insert 2 ledger records + insert transfer record
- `GET /api/v1/admin/wallet/transactions` — admin, view all transactions (filterable by user, type, date)
- `POST /api/v1/admin/wallet/credit` — admin, credit one or multiple users (remark required, audit logged)

### Wallet Service Rules
- Balance never goes below 0 — throw before any DB write
- All balance modifications go through `wallet.service.ts` — never direct DB updates elsewhere
- Every credit/debit/transfer inserts into `wallet_transactions` (append-only)
- `balance_after` computed and stored on each transaction record

---

## Phase 5 — Marketplace

**Cursor handles:**
- `GET /api/v1/marketplace/items` — list available items (filterable: type, in-stock only)
- `GET /api/v1/marketplace/items/:id` — item detail
- `POST /api/v1/marketplace/redeem` — redeem item
  - Validate: item available, sufficient stock, member has credits, remark required
  - Atomic: deduct credits, decrement stock (if not unlimited), create order, insert transaction
  - Digital items: include delivery content in response
- `GET /api/v1/marketplace/orders/mine` — own orders (paginated)
- `POST /api/v1/admin/marketplace/items` — admin, create item (multipart if image included)
- `PATCH /api/v1/admin/marketplace/items/:id` — admin, edit item
- `DELETE /api/v1/admin/marketplace/items/:id` — admin, soft delete (is_available: false)
- `GET /api/v1/admin/marketplace/orders` — admin, all orders (filterable by status)
- `PATCH /api/v1/admin/marketplace/orders/:id/fulfill` — admin, mark fulfilled with note, notify member

---

## Phase 6 — Events & RSVP

**Cursor handles:**
- `GET /api/v1/events` — list published events (paginated, filterable: upcoming/past)
- `GET /api/v1/events/:id` — event detail with RSVP count
- `POST /api/v1/events/:id/rsvp` — member RSVP (check cap if set, notify admin if cap reached)
- `DELETE /api/v1/events/:id/rsvp` — cancel RSVP
- `POST /api/v1/admin/events` — executive/admin, create event
- `PATCH /api/v1/admin/events/:id` — executive/admin, edit event
- `DELETE /api/v1/admin/events/:id` — executive/admin, delete event (cascade RSVPs)
- `GET /api/v1/admin/events/:id/rsvps` — executive/admin, RSVP list with member details
- `GET /api/v1/admin/events/:id/rsvps/export` — CSV export

---

## Phase 7 — CMS & Landing Page Content

**Cursor handles:**
- `GET /api/v1/cms/:sectionKey` — public, get section content
- `PUT /api/v1/cms/:sectionKey` — admin, update section (overwrites)
- Blog: full CRUD with draft/publish, slug generation, tag support
  - `GET /api/v1/blog` (paginated, filterable by tag, published only for public)
  - `GET /api/v1/blog/:slug`
  - `POST /api/v1/admin/blog` (with cover image upload)
  - `PATCH /api/v1/admin/blog/:id`
  - `DELETE /api/v1/admin/blog/:id` (deletes cover image from storage)
- News: same pattern, simpler schema
- Gallery: upload images to public bucket, list, delete (removes from storage)
- Faculty/Staff: CRUD with photo upload (replaces on update, deletes old from storage)
- Announcements: CRUD with target and expiry settings
- Newsletter subscribers: `POST /api/v1/subscribe`, `GET /api/v1/admin/subscribers/export` (CSV)
- Contact form: `POST /api/v1/contact` → sends email via Resend to configured address

---

## Phase 8 — Notifications

**Cursor handles:**
- `GET /api/v1/notifications` — own notifications (paginated, unread first)
- `PATCH /api/v1/notifications/:id/read` — mark single read
- `PATCH /api/v1/notifications/read-all` — mark all read
- `notification.service.ts` — internal service called by other services (vault, wallet, marketplace, events)
  - Creates DB notification record
  - Optionally sends email (based on user's notification preferences)
- Unread count included in `/users/me` response for navbar badge

---

## Phase 9 — Messaging

**Cursor handles:**
- `GET /api/v1/messages/conversations` — own conversations (sorted by last message)
- `POST /api/v1/messages/conversations` — create or return existing conversation with a user
- `GET /api/v1/messages/conversations/:id` — conversation with messages (paginated)
- `POST /api/v1/messages/conversations/:id/send` — send message
- `DELETE /api/v1/messages/:messageId` — soft delete own message
- Unread conversation count included in `/users/me` for navbar badge

---

## Phase 10 — Admin Portal Endpoints

**Cursor handles:**
- `GET /api/v1/admin/members` — list all members (paginated, search, filter by role/level/status)
- `GET /api/v1/admin/members/:id` — member detail with wallet balance
- `PATCH /api/v1/admin/members/:id` — change role, suspend/reactivate
- `GET /api/v1/admin/analytics` — overview stats (member count, upload count, credits distributed, active sessions)
- `POST /api/v1/admin/executives/assign` — super_admin, assign executive role for session with title
- `DELETE /api/v1/admin/executives/:assignmentId` — super_admin, revoke executive assignment
- `GET /api/v1/admin/executives` — list current executives
- `GET /api/v1/admin/settings` — get all site settings
- `PATCH /api/v1/admin/settings` — super_admin, update site settings (key-value pairs)

---

## Phase 11 — Jobs & Hardening

**Cursor handles:**
- Health ping cron (`/src/jobs/healthPing.ts`) — runs every 10 minutes, pings own `/health` endpoint, prevents Render sleep
- Expired PIN cleanup job — marks expired unused PINs as stale (runs daily)
- Expired notification cleanup — deletes read notifications older than 90 days (runs weekly)
- CORS configuration (whitelist only `FRONTEND_URL` from env)
- Helmet configuration (CSP, HSTS, X-Frame-Options, etc.)
- Final review: all routes have auth middleware, all list endpoints have pagination, all file deletions clean storage

---

## Dependency Summary

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.0.0",
    "zod": "^3.0.0",
    "pino": "^8.0.0",
    "pino-http": "^9.0.0",
    "resend": "^2.0.0",
    "multer": "^1.4.5",
    "uuid": "^9.0.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "ts-node": "^10.0.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/multer": "^1.4.0",
    "@types/cors": "^2.8.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```