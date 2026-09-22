# AGENTS.md

## Application Architecture

Ayaan Clothing is a single, frontend-only Next.js application:
- **Architecture:** Standalone frontend web application. There is currently no backend server.
- **Data Store:** Client-side mock store (`src/lib/mock-data/mock-store.ts`) with in-memory caching and persistent browser `localStorage`.
- **Services:** All services in `src/services/` directly use the client data store.
- **Port & Routing:** Single unified application running on port 3000 (`npm run dev`). Storefront is served from `/` and the admin management portal is served from `/admin`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
