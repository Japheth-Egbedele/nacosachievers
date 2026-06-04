This is a [Next.js](https://nextjs.org) project for the NACOS Achievers chapter platform (public site + The Hub).

## Source of truth (read this first)

**[Frontend Developer Handbook](../docs_JOE/FRONTEND_HANDBOOK.md)** — routes, API contract, auth, enums, and v1 scope.  
Check the **Last updated** date at the top before each sprint.

- API base URL: set `NEXT_PUBLIC_API_URL` in `.env.local`
- Product/context: [PRD](../docs_General/PRD.doc) (marketing/hub UX); handbook supersedes PRD for newer features (yearbook, careers, vault extensions)

## Minimal launch (elections)

Public `/` is **coming soon**; Hub has auth + elections. See [DEV_TESTING.md](../docs_JOE/DEV_TESTING.md).

Copy `.env.local.example` → `.env.local`. If the API runs on port 3000:

```bash
npm run dev -- -p 3001
```

Set backend `FRONTEND_URL=http://localhost:3001` for CORS.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
