# NACOS Platform — Cursor Rules

## Project Context
Full-stack NACOS university chapter platform.
- Backend: Node.js + Express + TypeScript
- Database: Supabase (PostgreSQL) with Row-Level Security
- File Storage: Supabase Storage (private bucket for PDFs, public for images)
- Auth: JWT (RS256, 15min) + refresh tokens (httpOnly cookie, 7 days)
- Hosting: Render (API), Vercel (Frontend)
- Email: Resend

---

## General Rules

- Always use TypeScript. No `any` types unless absolutely unavoidable and always comment why.
- Always use `async/await`. Never use raw `.then()` chains.
- Every function must have explicit return type annotations.
- Use named exports. No default exports except for Express routers.
- Use `const` by default. Only use `let` when reassignment is required.
- Never use `var`.
- Prefer early returns to reduce nesting. Avoid deeply nested if/else blocks.
- All magic numbers and strings must be constants in a `/src/constants` file.
- Never hardcode secrets, URLs, or environment values — always use `process.env` with validation at startup.

---

## File & Folder Structure

```
/src
  /config         → env validation, supabase client, resend client
  /constants      → role enums, status enums, credit types, error messages
  /controllers    → one file per resource (auth, users, vault, wallet, etc.)
  /middleware     → auth, roleGuard, validate, rateLimiter, upload
  /routes         → one file per resource, mounted in app.ts
  /services       → business logic, separated from controllers
  /db             → supabase query helpers, typed query functions
  /utils          → helpers (token generation, hashing, file validation, etc.)
  /types          → shared TypeScript interfaces and types
  /jobs           → cron jobs (health ping, cleanup tasks)
  app.ts          → express setup, middleware mount, route mount
  server.ts       → http server startup
```

- Controllers handle HTTP in/out only. All business logic lives in services.
- Services call db helpers. Services never touch `req` or `res`.
- One concern per file. If a file exceeds 200 lines, split it.

---

## Naming Conventions

- Files: `kebab-case.ts` (e.g., `vault-upload.service.ts`)
- Classes: `PascalCase`
- Functions and variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- DB table references: match exact Supabase table name (snake_case)
- Types/Interfaces: `PascalCase` with descriptive names (e.g., `WalletTransaction`, not `WT`)

---

## API Design

- All routes prefixed with `/api/v1`
- RESTful resource naming: `/api/v1/vault/uploads`, `/api/v1/wallet/transactions`
- HTTP methods: GET (read), POST (create), PATCH (partial update), DELETE (remove)
- Never use GET for state-changing operations
- All responses follow this envelope:
```typescript
// Success
{ success: true, data: T, message?: string }

// Error
{ success: false, error: string, code?: string }

// Paginated
{ success: true, data: T[], meta: { total: number, page: number, limit: number } }
```
- Always return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 409, 422, 500)
- Never expose stack traces or internal error messages in responses
- Use generic error messages for auth failures: "Invalid credentials" not "Password incorrect"

---

## Authentication & Security

- Access token payload contains ONLY: `{ sub: userId, role: UserRole, iat, exp }`
- Never put email, matric number, or any PII in the JWT payload
- Refresh tokens: always hash before storing (SHA-256), compare hash only
- PINs: bcrypt hash, cost factor 12, single-use, 72hr expiry
- Passwords: bcrypt, cost factor 12 minimum
- All string comparisons for tokens/PINs must use constant-time comparison (`crypto.timingSafeEqual`)
- Rate limiting is mandatory on: login, register, forgot-password, reset-password, file upload
- Input validation with Zod on every controller entry point before any service call
- File uploads: validate MIME type AND magic bytes (not just extension)
- Never trust client-supplied file types

---

## Database Rules

- All DB operations go through typed service/db helper functions — never write raw Supabase queries in controllers
- Wallet balance updates MUST be atomic: always update `wallet_balance` and insert `wallet_transactions` in the same DB transaction
- Transfers MUST be atomic: debit sender + credit receiver + insert two transaction records in a single transaction
- `wallet_transactions` table is append-only — never update or delete rows from it
- Always check available balance before any debit — throw before any DB write if insufficient
- Use Supabase RLS as a second layer, not the primary auth layer (middleware is primary)
- Never use `select *` in production queries — always specify columns
- Add pagination to any endpoint that returns a list (default limit: 20, max: 100)

---

## File Storage

- Vault PDFs → private Supabase bucket (`vault-documents`)
  - Validate PDF magic bytes (`%PDF`) server-side before upload
  - Max file size: 10MB enforced server-side
  - Generate signed URL (1 hour expiry) per download request — never expose raw storage path
- Gallery images and profile photos → public Supabase bucket (`public-images`)
  - Append `?width=800&quality=80` to image URLs in API responses for optimized delivery
  - Accept: JPEG, PNG, WebP only (validate magic bytes)
  - Max size: 5MB
- Delete file from storage when DB record is deleted — no orphaned files
- Never expose the Supabase service role key to the client

---

## Error Handling

- All async route handlers wrapped in a `catchAsync` utility (no unhandled promise rejections)
- Global error handler middleware catches all thrown errors
- Create typed custom error classes: `AppError`, `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`
- Log full error details server-side (Winston/Pino), return safe generic message to client
- Never log passwords, tokens, PIN values, or any credential
- 500 errors should always be logged with request context (route, method, user_id if available)

---

## Logging

- Use structured JSON logging (Pino preferred for performance)
- Log levels: `error`, `warn`, `info`, `debug`
- Always log: auth events (login, logout, failed attempts), admin actions, wallet operations, file operations
- Never log: passwords, tokens, raw PINs, full request bodies on auth routes
- Include `user_id`, `route`, `method`, `statusCode`, `durationMs` in request logs

---

## Environment Variables

Always validate all env vars at startup using a config validation module. If any required var is missing, crash immediately with a clear error message. Required vars:

```
NODE_ENV
PORT
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
JWT_PRIVATE_KEY
JWT_PUBLIC_KEY
REFRESH_TOKEN_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
FRONTEND_URL
CRON_SECRET
```

---

## What NOT to Do

- Never return raw Supabase errors to the client
- Never skip input validation
- Never do balance math in JavaScript — let the DB handle atomicity
- Never generate signed URLs client-side (requires service role key)
- Never trust `req.body` without Zod validation first
- Never commit `.env` files
- Never use `console.log` in production code — use the logger
- Never write business logic in route files
- Never allow unbounded list queries (always paginate)
- Never update or delete wallet transaction records

---

## Code Style

- No commented-out code in commits
- Every exported function must have a JSDoc comment with `@param` and `@returns`
- Zod schemas defined in a `/src/schemas` folder, co-located by resource
- All enums defined in `/src/constants/enums.ts` and used everywhere (no inline string literals for status/role values)