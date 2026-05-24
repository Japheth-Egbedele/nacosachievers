# NACOS Platform — Manual Setup Guide

Everything in this file must be done by hand. AI cannot do these steps.
Complete them in order before running any code.

---

## Step 1 — Supabase Project

1. Go to https://supabase.com and create an account
2. Create a new project — name it `nacos-platform`
3. Choose a strong database password and save it somewhere secure
4. Select the region closest to Nigeria (Europe West is typically best latency from NG)
5. Wait for project to finish provisioning (~2 minutes)
6. Go to **Project Settings → API**
   - Copy `Project URL` → this is `SUPABASE_URL`
   - Copy `service_role` key (secret) → this is `SUPABASE_SERVICE_ROLE_KEY`
   - **Never expose the service role key to the frontend or commit it to git**

---

## Step 2 — Supabase Database Tables

Go to **SQL Editor** in Supabase and run each block below **from top to bottom**. Sections **2.20** and **2.21** intentionally appear **before 2.18** so yearbook and career tables exist before indexes reference them.

### 2.1 — Enable UUID Extension
```sql
create extension if not exists "uuid-ossp";
```

### 2.2 — Enums
```sql
create type user_role as enum ('super_admin', 'executive', 'member', 'alumni', 'guest');
create type user_level as enum ('100', '200', '300', '400', 'staff');
create type academic_status as enum ('active', 'alumni', 'suspended', 'transferred_out');
create type admission_type as enum ('regular', 'transfer', 'readmission');
create type transaction_type as enum ('credit', 'debit', 'transfer_in', 'transfer_out', 'redemption', 'upload_reward', 'career_submission_bounty');
create type upload_status as enum ('pending', 'approved', 'rejected');
create type order_status as enum ('pending', 'fulfilled', 'cancelled');
create type item_type as enum ('digital', 'physical');
create type event_status as enum ('draft', 'published', 'cancelled');
create type notification_type as enum ('vault_approved', 'vault_rejected', 'credit_received', 'transfer', 'order_update', 'announcement', 'message', 'event_reminder', 'career_verified', 'career_rejected', 'yearbook_published');
create type announcement_target as enum ('public', 'members', 'all');
create type blog_status as enum ('draft', 'published');
create type semester_type as enum ('1', '2');
create type yearbook_edition_status as enum ('draft', 'published', 'archived');
create type employment_type as enum ('full_time', 'part_time', 'adjunct', 'visiting', 'external');
create type teaching_status as enum ('active', 'on_sabbatical', 'on_leave');
create type upload_kind as enum ('past_question', 'course_material');
create type career_posting_status as enum ('draft', 'pending_verification', 'verified', 'rejected', 'expired');
create type work_mode as enum ('onsite', 'remote', 'hybrid');
```

### 2.3 — Departments
```sql
create table departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into departments (name, code) values ('Computer Science', 'CS');
```

### 2.4 — Academic Sessions
```sql
create table academic_sessions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 2.5 — Users
```sql
create table users (
  id uuid primary key default uuid_generate_v4(),
  matric_number text not null unique,
  email text not null unique,
  password_hash text not null,
  role user_role not null default 'member',
  first_name text not null,
  last_name text not null,
  display_name text,
  bio text,
  profile_photo_url text,
  department_id uuid references departments(id),
  level user_level,
  level_of_entry user_level,
  year_of_admission integer,
  expected_graduation_year integer,
  actual_graduation_year integer,
  academic_status academic_status not null default 'active',
  admission_type admission_type not null default 'regular',
  linkedin_url text,
  github_url text,
  other_social_links jsonb default '{}',
  email_visible boolean not null default false,
  wallet_balance integer not null default 0,
  is_email_verified boolean not null default false,
  is_active boolean not null default true,
  notification_prefs jsonb default '{"email_on_vault": true, "email_on_credit": true, "email_on_transfer": true, "email_on_order": true}',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.6 — Onboarding PINs
```sql
create table onboarding_pins (
  id uuid primary key default uuid_generate_v4(),
  pin_hash text not null,
  matric_number text not null,
  department_id uuid references departments(id),
  created_by uuid references users(id),
  expires_at timestamptz not null,
  is_used boolean not null default false,
  used_at timestamptz,
  level_of_entry user_level,
  admission_type admission_type not null default 'regular',
  created_at timestamptz not null default now()
);
```

### 2.7 — Auth Support Tables
```sql
create table email_verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table password_resets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table refresh_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  family_id uuid not null,
  expires_at timestamptz not null,
  is_revoked boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 2.8 — Executive Assignments
```sql
create table executive_assignments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  session_id uuid references academic_sessions(id),
  role_title text not null,
  assigned_by uuid not null references users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### 2.9 — Vault
```sql
create table vault_courses (
  id uuid primary key default uuid_generate_v4(),
  department_id uuid not null references departments(id),
  level user_level not null,
  semester semester_type not null,
  course_code text not null,
  course_name text not null,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique(department_id, course_code, level, semester)
);

create table vault_uploads (
  id uuid primary key default uuid_generate_v4(),
  uploader_id uuid not null references users(id),
  course_id uuid not null references vault_courses(id),
  title text not null,
  description text,
  file_url text not null,
  file_size_bytes integer not null,
  file_name text not null,
  status upload_status not null default 'pending',
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  download_count integer not null default 0,
  flag_count integer not null default 0,
  credits_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table vault_uploads add column upload_kind upload_kind not null default 'past_question';

create table vault_flags (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid not null references vault_uploads(id) on delete cascade,
  flagged_by uuid not null references users(id),
  reason text not null,
  resolved boolean not null default false,
  resolved_by uuid references users(id),
  created_at timestamptz not null default now()
);
```

Lecturers and per-session teaching assignments (vault courses):

```sql
create table lecturers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  title text,
  photo_url text,
  email text,
  department_id uuid references departments(id),
  employment_type employment_type not null default 'full_time',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table course_teaching_assignments (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references vault_courses(id) on delete cascade,
  lecturer_id uuid not null references lecturers(id),
  session_id uuid references academic_sessions(id),
  semester semester_type not null,
  teaching_status teaching_status not null default 'active',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  unique(course_id, lecturer_id, session_id, semester)
);
```

### 2.10 — Wallet
```sql
create table wallet_transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  type transaction_type not null,
  amount integer not null check (amount > 0),
  balance_after integer not null,
  remark text not null check (char_length(remark) >= 3),
  reference_id uuid,
  actor_id uuid references users(id),
  created_at timestamptz not null default now()
);

create table transfers (
  id uuid primary key default uuid_generate_v4(),
  sender_id uuid not null references users(id),
  receiver_id uuid not null references users(id),
  amount integer not null check (amount > 0),
  remark text not null,
  sender_tx_id uuid references wallet_transactions(id),
  receiver_tx_id uuid references wallet_transactions(id),
  created_at timestamptz not null default now()
);
```

### 2.11 — Marketplace
```sql
create table marketplace_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price_in_credits integer not null check (price_in_credits > 0),
  item_type item_type not null,
  stock_count integer,
  image_url text,
  is_available boolean not null default true,
  digital_delivery_content text,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  item_id uuid not null references marketplace_items(id),
  quantity integer not null default 1,
  total_credits_spent integer not null,
  status order_status not null default 'pending',
  fulfillment_note text,
  fulfilled_by uuid references users(id),
  fulfilled_at timestamptz,
  transaction_id uuid references wallet_transactions(id),
  created_at timestamptz not null default now()
);
```

### 2.12 — Events
```sql
create table events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  start_datetime timestamptz not null,
  end_datetime timestamptz,
  location text,
  is_online boolean not null default false,
  meeting_link text,
  banner_image_url text,
  rsvp_limit integer,
  status event_status not null default 'draft',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_rsvps (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);
```

### 2.13 — CMS & Content
```sql
create table cms_sections (
  id uuid primary key default uuid_generate_v4(),
  section_key text not null unique,
  content jsonb not null default '{}',
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

create table blog_posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content jsonb not null default '{}',
  cover_image_url text,
  author_id uuid references users(id),
  status blog_status not null default 'draft',
  published_at timestamptz,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table gallery_items (
  id uuid primary key default uuid_generate_v4(),
  title text,
  image_url text not null,
  event_id uuid references events(id) on delete set null,
  tags text[] default '{}',
  uploaded_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table faculty_staff (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  position text not null,
  role_category text not null default 'staff',
  bio text,
  photo_url text,
  email text,
  department_id uuid references departments(id),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  is_active boolean not null default true,
  target announcement_target not null default 'members',
  expires_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table news_items (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  image_url text,
  published_at timestamptz not null default now(),
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.14 — Alumni Badges
```sql
create table alumni_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id),
  badge_type text not null,
  label text not null,
  session_id uuid references academic_sessions(id),
  awarded_by uuid references users(id),
  created_at timestamptz not null default now()
);
```

### 2.15 — Messaging
```sql
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now()
);

create table conversation_participants (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references users(id),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique(conversation_id, user_id)
);

create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references users(id),
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 2.16 — Notifications
```sql
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  type notification_type not null,
  reference_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
```

### 2.17 — Site Settings & Newsletter
```sql
create table site_settings (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,
  value jsonb not null,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);

insert into site_settings (key, value) values
  ('vault_upload_credit_reward', '10'),
  ('max_transfer_amount', '500'),
  ('transfer_cooldown_minutes', '5'),
  ('career_submission_bounty_credits', '0'),
  ('current_department_name', '"Computer Science"'),
  ('current_department_code', '"CS"'),
  ('whatsapp_community_link', '""'),
  ('nacos_instagram', '""'),
  ('nacos_twitter', '""'),
  ('nacos_linkedin', '""'),
  ('cyberspace_discord', '""'),
  ('cyberspace_instagram', '""'),
  ('cyberspace_twitter', '""'),
  ('contact_email', '""'),
  ('contact_phone', '""'),
  ('contact_office', '""');

insert into cms_sections (section_key, content) values
  ('yearbook_teaser', '{"headline": "Class Yearbooks", "subtext": "Browse alumni yearbooks when published.", "enabled": true}');

create table newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  is_active boolean not null default true,
  subscribed_at timestamptz not null default now()
);
```

**Career board (Phase 13):** `career_submission_bounty_credits` defaults to **0** so no payout runs until an admin sets a positive integer via site settings.

### 2.20 — Yearbook

Run after core tables (`users`, `academic_sessions`) exist.

```sql
create table yearbook_editions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  session_id uuid references academic_sessions(id),
  status yearbook_edition_status not null default 'draft',
  submissions_open boolean not null default true,
  cohort_alumni_unlocked_at timestamptz,
  pdf_storage_path text,
  pdf_cache_version integer not null default 0,
  pdf_built_at_version integer not null default 0,
  pdf_generated_at timestamptz,
  pdf_build_status text not null default 'none',
  layout_config jsonb default '{}',
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table yearbook_slots (
  id uuid primary key default uuid_generate_v4(),
  edition_id uuid not null references yearbook_editions(id) on delete cascade,
  user_id uuid not null references users(id),
  display_name text,
  portrait_url text,
  quote text,
  include_in_yearbook boolean not null default true,
  sort_key integer not null default 0,
  admin_notes text,
  last_edited_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(edition_id, user_id)
);
```

### 2.21 — Career Board

```sql
create table career_postings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  organization text not null,
  description text not null,
  application_url text not null,
  location text,
  work_mode work_mode not null default 'onsite',
  expires_at timestamptz,
  status career_posting_status not null default 'pending_verification',
  submitter_id uuid references users(id),
  submitter_credited boolean not null default false,
  verifier_id uuid references users(id),
  verified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 2.18 — Indexes
```sql
create index idx_users_matric on users(matric_number);
create index idx_users_email on users(email);
create index idx_users_role on users(role);
create index idx_vault_uploads_status on vault_uploads(status);
create index idx_vault_uploads_course on vault_uploads(course_id);
create index idx_wallet_transactions_user on wallet_transactions(user_id);
create index idx_wallet_transactions_created on wallet_transactions(created_at desc);
create index idx_notifications_user_unread on notifications(user_id, is_read);
create index idx_messages_conversation on messages(conversation_id, created_at desc);
create index idx_blog_posts_slug on blog_posts(slug);
create index idx_blog_posts_status on blog_posts(status);
create index idx_events_status_start on events(status, start_datetime);
create index idx_yearbook_slots_edition on yearbook_slots(edition_id);
create index idx_career_postings_status on career_postings(status, expires_at);
create index idx_course_assignments_course on course_teaching_assignments(course_id, session_id);
```

### 2.19 — Seed Super Admin

Run this after your Node.js project is set up. Generate a bcrypt hash of your chosen password first:
```bash
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('YOUR_PASSWORD_HERE', 12).then(h => console.log(h))"
```
Then insert:
```sql
insert into users (
  matric_number, email, password_hash, role,
  first_name, last_name, is_email_verified, academic_status
) values (
  'ADMIN001',
  'your-email@domain.com',
  'PASTE_BCRYPT_HASH_HERE',
  'super_admin',
  'Super', 'Admin',
  true,
  'active'
);
```

---

## Step 3 — Supabase Storage Buckets

Go to **Storage** in Supabase dashboard.

**Create these buckets:**

| Bucket Name | Public? | Purpose |
|---|---|---|
| `vault-documents` | ❌ Private | Past question PDFs |
| `public-images` | ✅ Public | Profile photos, gallery, blog covers, faculty photos, marketplace item images |
| `yearbook-portraits` | ❌ Private | Member portrait uploads for yearbook slots |
| `yearbook-pdfs` | ❌ Private | Compiled yearbook PDF per edition |
| `yearbook-assets` | ✅ Public | Background templates, borders, decorative assets |

**For `yearbook-portraits` and `yearbook-pdfs`:**
- Keep private
- Access only via signed URLs generated by your backend (service role key)

**For `yearbook-assets`:**
- Public CDN URLs are acceptable for template/decorative assets

**For `vault-documents`:**
- Keep private
- Access only via signed URLs generated by your backend (service role key)

**For `public-images`:**
- Set as public
- Files served directly via CDN URL
- Always append `?width=800&quality=80` for image transformations in API responses

---

## Step 4 — Generate JWT Key Pair (RS256)

Run these commands on your local machine:
```bash
# Generate private key
openssl genrsa -out private.pem 2048

# Generate public key from private
openssl rsa -in private.pem -pubout -out public.pem

# Print private key (single line for env var)
cat private.pem | base64 -w 0

# Print public key (single line for env var)
cat public.pem | base64 -w 0
```
Store both base64 strings as environment variables. Delete the `.pem` files after. Never commit them.

---

## Step 5 — Resend (Email)

1. Go to https://resend.com and create an account
2. Get your API key from the dashboard → this is `RESEND_API_KEY`
3. For sending emails, you'll use `onboarding@resend.dev` during development (no domain needed)
4. When your domain is ready:
   - Go to **Domains** in Resend
   - Add your domain and follow the DNS verification steps
   - Use `noreply@yourdomain.com` as `RESEND_FROM_EMAIL`

---

## Step 6 — Render (Backend Hosting)

1. Go to https://render.com and create an account
2. Connect your GitHub repository
3. Create a **Web Service**
   - Environment: Node
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Instance type: Free
4. Add all environment variables from Step 7 in the Render dashboard
5. Copy your Render service URL — this is your backend API base URL
6. Share this URL with the frontend developer as `NEXT_PUBLIC_API_URL`

---

## Step 7 — Environment Variables

Create a `.env` file locally (never commit this). Set the same vars in Render dashboard.

```env
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT (paste base64-encoded PEM content from Step 4)
JWT_PRIVATE_KEY=base64_encoded_private_key
JWT_PUBLIC_KEY=base64_encoded_public_key
REFRESH_TOKEN_SECRET=generate_a_random_64_char_string_here

# Email
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# App
FRONTEND_URL=https://your-vercel-app.vercel.app
CRON_SECRET=generate_a_random_32_char_string_here
```

Generate `CRON_SECRET` and `REFRESH_TOKEN_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Run twice for separate values.

---

## Step 8 — cron-job.org (Keep-Alive)

1. Go to https://cron-job.org and create a free account
2. Create two cron jobs:

**Job 1 — Render Keep-Alive**
- URL: `https://your-render-app.onrender.com/health`
- Schedule: Every 10 minutes
- Method: GET

**Job 2 — Supabase Keep-Alive**
- URL: `https://your-render-app.onrender.com/health` (same endpoint — it does a lightweight Supabase ping internally)
- Schedule: Every 8 minutes (offset from Job 1)

This prevents both Render sleep and Supabase free tier pausing.

---

## Step 9 — Domain (When Ready)

1. Purchase a `.com.ng` or `.ng` domain (cheapest Nigerian TLD — try Whogohost or SmartWeb Nigeria)
2. Point DNS to Vercel (for frontend) following Vercel's custom domain guide
3. Create a subdomain `api.yourdomain.com` pointing to your Render service
4. Add your domain to Resend for transactional emails (Step 5)
5. Update `FRONTEND_URL` in Render env vars to your actual domain
6. Update `NEXT_PUBLIC_API_URL` in Vercel env vars to `https://api.yourdomain.com`

---

## Step 10 — Supabase Row-Level Security (RLS)

Enable RLS on all tables to add a second layer of protection beyond your API middleware.

Run in SQL Editor:
```sql
-- Enable RLS on all tables
alter table users enable row level security;
alter table vault_uploads enable row level security;
alter table wallet_transactions enable row level security;
alter table transfers enable row level security;
alter table orders enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table yearbook_editions enable row level security;
alter table yearbook_slots enable row level security;
alter table career_postings enable row level security;
alter table lecturers enable row level security;
alter table course_teaching_assignments enable row level security;

-- Service role bypasses RLS (your backend uses service role key)
-- These policies are safety nets for any direct DB access
-- Allow service role full access (your API always uses this)
create policy "Service role full access" on users
  for all using (auth.role() = 'service_role');
```

Repeat the service role policy for each table. Your Node.js backend uses the service role key so it bypasses RLS — these policies block any direct non-service-role DB access.

---

## Checklist Before First Deploy

- [ ] Supabase project created, all SQL run in order (§2.1–2.21, then §2.18 indexes, then §2.19 super admin)
- [ ] All **five** storage buckets created with correct privacy settings (see Step 3)
- [ ] JWT key pair generated, stored as base64 in env
- [ ] Resend account created, API key saved
- [ ] Render service created, all env vars set
- [ ] cron-job.org jobs set up
- [ ] Super admin seeded in DB
- [ ] `.env` file is in `.gitignore`
- [ ] No secrets committed to git