# Migration Report: Frontend Files to be Removed

The following files and folders are identified as frontend-only components, assets, pages, or configurations, and will be deleted from the `saleslay-be` repository.

| File/Folder | Reason for Removal |
| :--- | :--- |
| `app/auth/` | Frontend Auth pages (sign-in, joinnow, etc.) |
| `app/contact/` | Frontend Contact pages |
| `app/favicon.ico` | Frontend static asset |
| `app/globals.css` | Frontend styles and Tailwind imports |
| `app/layout.tsx` | Frontend Root Layout component |
| `app/loading.tsx` | Frontend loading component |
| `app/page.tsx` | Frontend Landing Page component |
| `app/privacy-policy/` | Frontend Privacy Policy pages |
| `app/providers.tsx` | Frontend React session providers |
| `app/terms-of-service/` | Frontend Terms of Service pages |
| `app/user/` | Frontend user dashboard pages, subcomponents, and dummy data |
| `components/` | Frontend UI components (React, shadcn, etc.) |
| `components.json` | Frontend shadcn/ui framework configuration |
| `hooks/` | Frontend React hooks (like use-mobile.ts) |
| `public/` | Frontend static assets (fonts, icons) |
| `config/dashboard-sidebar.config.ts` | Frontend UI layout configuration |
| `config/legal-pages.config.ts` | Frontend UI text content configuration |
| `config/navbar.config.ts` | Frontend UI layout configuration |
| `lib/utils.ts` | Frontend-only styling/classnames helper (`cn`) |
| `next.config.ts` | Next.js fullstack dev/build configuration |
| `postcss.config.mjs` | Frontend CSS processing configuration |
| `next-env.d.ts` | Next.js type declarations |
| `.next/` | Next.js build cache and outputs |
| `eslint-config-next` (dependency in package.json) | Frontend-specific Next.js linting config |

---

# Retained Backend Files & Folders

The following files and folders contain backend business logic, database configurations, integrations, and worker daemons, and will be retained.

| File/Folder | Reason for Retention |
| :--- | :--- |
| `app/api/` | REST API route handlers (GET, POST, PUT, DELETE, PATCH) |
| `worker/` | BullMQ worker processes for SMS, Email, and Workflow automation |
| `prisma/` | MongoDB database schema and schema configurations |
| `lib/` | Backend services (hubspot, openai, twilio, sendgrid, queues) |
| `config/dashboard-dummy.config.ts` | Backend sandbox/dummy mode configuration |
| `config/integrations.config.ts` | Integration providers definitions and configurations |
| `Dockerfile` | Container build instruction (updated to run express app) |
| `tsconfig.json` | TS project configuration (updated for Node output target) |
| `eslint.config.mjs` | ESLint configuration (updated for general TypeScript target) |
| `package.json` | Node dependencies and scripts (updated for Express runtime) |
| `auth.ts` | NextAuth configuration and handlers (used by Express) |
