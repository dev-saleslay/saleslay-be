# SalesLay Backend (`saleslay-be`)

This is the backend-only repository for the SalesLay platform. The frontend has been moved to a separate repository (`saleslay-fe`).

This repository acts as a standalone Express server that hosts standard web-style route handlers (from the `app/api/` folder) and handles background job queues via BullMQ.

---

## Technical Stack

* **Runtime**: Node.js (TypeScript)
* **Web Server**: Express (coupled with a custom adapter mapping Next.js standard Request/Response style routes)
* **Database**: MongoDB (via Prisma Client)
* **Job Queue**: BullMQ (backed by Redis)
* **Authentication**: NextAuth session cookie decryption (via `next-auth/jwt`)

---

## Directory Structure

* [app/api/](file:///Users/shahbazkhan/Desktop/saleslay/saleslay-be/app/api/) — Backend REST API route files (`route.ts`) containing endpoint logic.
* [worker/](file:///Users/shahbazkhan/Desktop/saleslay/saleslay-be/worker/) — Queue processor worker daemon (SMS, email, and playbook automation workflows).
* [lib/](file:///Users/shahbazkhan/Desktop/saleslay/saleslay-be/lib/) — Backend services, queue helpers, templates logic, database connection setup, and integrations.
* [prisma/](file:///Users/shahbazkhan/Desktop/saleslay/saleslay-be/prisma/) — Database schema definitions (`schema.prisma`) and migrations.
* [config/](file:///Users/shahbazkhan/Desktop/saleslay/saleslay-be/config/) — Server-side configurations (integrations definitions, sandbox configurations).
* [server.ts](file:///Users/shahbazkhan/Desktop/saleslay/saleslay-be/server.ts) — Main entry point for the standalone Express application.

---

## Environment Variables

Make sure to configure a `.env` file in the root directory. Key environment variables include:

* `DATABASE_URL`: MongoDB connection URL.
* `REDIS_URL`: Redis connection URL (required for BullMQ).
* `AUTH_SECRET` / `NEXTAUTH_SECRET`: Shared encryption key for decoding frontend NextAuth session cookies.
* `HUBSPOT_CLIENT_ID` & `HUBSPOT_CLIENT_SECRET`: HubSpot OAuth credentials.
* `HUBSPOT_REDIRECT_URI`: HubSpot OAuth callback endpoint.
* `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`: Twilio credentials for SMS handling.

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Run Development Server

Runs the Express server with live TypeScript reloading via `tsx`:

```bash
npm run dev
```

### 4. Run Queue Workers Daemon

```bash
npm run worker
```

---

## Production Build & Execution

To compile the TypeScript project and run in a production environment:

### Build

Compiles TypeScript to the `/dist` directory and resolves path aliases:

```bash
npm run build
```

### Run Server

```bash
npm run start
```
