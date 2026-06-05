# Hub UI design system

Visual direction: warm minimal surfaces, serif display headings, sidebar navigation, **NACOS logo green** used sparingly for CTAs and active states.

## Brand colors (CSS variables)

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--color-brand` | `#047857` | `#34d399` | Primary buttons, links, active nav |
| `--color-brand-soft` | `#ecfdf5` | `rgba(16,185,129,0.1)` | Success alerts, hover fills |
| `--color-brand-gold` | `#b45309` | `#fbbf24` | Rare hints (e.g. format warnings) |
| `--color-hub-bg` | `#f5f4f0` | `#0c0f0e` | Page background |
| `--color-hub-surface` | `#ffffff` | `#141816` | Cards, sidebar |

Defined in [`frontend/app/globals.css`](../frontend/app/globals.css). Dark mode follows `prefers-color-scheme: dark`.

## Layout patterns

### Member portal (`HubShell`)
- Desktop: fixed left sidebar (logo, Elections, Admin if applicable, user card)
- Mobile: compact top bar
- Content: `.hub-card` on cream/dark background
- Default home: `/hub/elections`

### Admin (`AdminShell`)
- Nested sidebar with `.hub-nav-active` gradient
- List pages use `HubListCard`, `HubAdminSearch`, `HubAlert`

### Auth (`HubAuthLayout`)
- Warm gradient background, centered card, serif title

## Shared components

| Component | Path |
|-----------|------|
| `HubAuthLayout` | `app/hub/components/ui/HubAuthLayout.tsx` |
| `HubPageHeader` | `app/hub/components/ui/HubPageHeader.tsx` |
| `HubPillTabs` | `app/hub/components/ui/HubPillTabs.tsx` |
| `HubAlert` | `app/hub/components/ui/HubAlert.tsx` |
| `HubField` / `HubTextInput` | `app/hub/components/ui/HubField.tsx` |
| `HubListCard` / `HubListEmpty` | `app/hub/components/ui/HubListCard.tsx` |
| `HubAdminSearch` | `app/hub/components/ui/HubAdminSearch.tsx` |

Style helpers: [`frontend/lib/hub-styles.ts`](../frontend/lib/hub-styles.ts)

## Onboarding

### PIN validation (register step 1)

API returns distinct codes:

| Code | Message |
|------|---------|
| `MATRIC_NOT_FOUND` | No PIN for this matric — contact admin |
| `PIN_ALREADY_USED` | PIN already used — ask for new PIN |
| `PIN_EXPIRED` | PIN expired — ask for new PIN |
| `INVALID_PIN` | Wrong PIN code |

Frontend: [`frontend/lib/pin-errors.ts`](../frontend/lib/pin-errors.ts)

### Email verify → auto-login

`POST /auth/verify-email` validates the one-time token, marks email verified, issues JWT + refresh cookie, and the verify page redirects to `/hub/elections` without a separate login step.

## Member experience

- Nav: **Elections** (+ **Admin portal** for admins)
- Elections: tabs All / Live / Upcoming / Closed; default **Live**
