<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- This project is on **Next.js 16.3** (App Router, React 19). Auth/route gating lives in `src/proxy.ts` (Next 16's replacement for `middleware.ts`). Route and page `params` are Promises — `await params` in route handlers/server pages, `use(params)` in client pages.
- If you delete a route file and `tsc` complains about missing modules, `rm -rf .next` and re-run.
- The background worker (publishes scheduled posts, cleans up old uploads) starts from `src/instrumentation.ts`; it assumes exactly one server process (SQLite, single replica).
- Phase 1 only: creators upload their own videos and post/schedule them. The video generator, media library, video templates and per-account posting cycles live in `phase2/` (excluded from the build, type-check and lint) until Phase 2.
