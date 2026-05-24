# NACOS Backend API

Express + TypeScript API for the NACOS Achievers platform.

## Setup

1. Complete [MANUAL_SETUP.md](../docs_JOE/MANUAL_SETUP.md) (Supabase SQL, buckets, JWT keys).
2. Copy `.env.example` → `.env` and fill all values (include `REFRESH_TOKEN_SECRET`).
3. Install and run:

```bash
npm install
npm run dev
```

API base: `http://localhost:3000`  
Health: `GET /health`  
Versioned routes: `/api/v1/...`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development with hot reload (tsx) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run production build |

## Implemented

Phases **0–13** per [BUILD_PLAN.md](../docs_JOE/BUILD_PLAN.md):

| Phase | Area |
|-------|------|
| 0 | Scaffold, config, middleware, health |
| 1 | Auth (PIN, register, login, refresh, password reset) |
| 2 | Users (profile, photo, alumni, leaderboard, yearbook member routes) |
| 3 | Vault (courses, uploads, lecturers, teaching assignments) |
| 4–5 | Wallet & marketplace |
| 6 | Events & RSVPs |
| 7 | CMS (blog, news, gallery, faculty, announcements, subscribe, contact) |
| 8–9 | Notifications & messages |
| 10 | Admin dashboard, settings, audit |
| 11 | Background jobs (pins, notifications, careers, health ping) |
| 12 | Yearbook (editions, slots, PDF build) |
| 13 | Career board (public listings, submissions, admin verify) |

Frontend integration: [FRONTEND_HANDBOOK.md](../docs_JOE/FRONTEND_HANDBOOK.md)
