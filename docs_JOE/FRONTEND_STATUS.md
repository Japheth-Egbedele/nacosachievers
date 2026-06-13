# Frontend build status

Quick map of what is implemented in the Hub vs what the [Frontend Handbook](./FRONTEND_HANDBOOK.md) describes for later phases.

| Area | Status | Notes |
|------|--------|--------|
| Hub auth (login, register, verify, forgot/reset) | Built | Student + staff PIN flows |
| Elections (vote, abstain, results, public share) | Built | Per-position abstain; admin live-results confirm |
| Admin portal (scoped nav, members, PINs, elections, vault, wallet) | Built | Empty `admin_scopes` denied until sync |
| Wallet (member transfer, admin single + bulk credit) | Built | Bulk up to 100 rows |
| Vault (member upload, admin review, flags, assignments) | Built | Course delete; lecturer assignments |
| Notifications / Messages | Minimal | List pages wired to API |
| CMS marketing pages (`/about`, `/blog`, …) | Stub / coming soon | Handbook Phase 2+ |
| Marketplace member UI | Partial | Admin CRUD; member redeem exists |
| Yearbook member self-service | Partial | Admin editions; profile portrait |
| Next.js `middleware.ts` | Built | `nacos_hub` cookie gate on portal routes |
| Vitest (backend smoke) | Built | Member patch guard + election results |

Environment: copy [`frontend/.env.local.example`](../frontend/.env.local.example) → `.env.local` and set `NEXT_PUBLIC_API_URL`.
