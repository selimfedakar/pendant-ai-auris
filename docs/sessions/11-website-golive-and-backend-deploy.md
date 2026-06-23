# 11 — Website Go-Live: Backend Deploy & Verification

**Date:** Jun 21, 2026
**Scope:** production deploy of the public backend endpoint (`backend/src/index.ts`),
verification of the live marketing site build, and repo hygiene. No app, firmware,
or web *source* changes this session — this is the **operational go-live** of the
Stage 4 work described in report 10.

This is the monorepo-level summary. Report 10 explains *what was built*; this report
explains *how it was shipped to production and verified*.

---

## Context

Report 10 (Stage 4) added `GET /reserve/count` to the Worker and a `WaitlistCount`
social-proof badge to the site. That code was correct but **not deployed** — the live
endpoint returned 404 and the badge failed silent. The marketing site was therefore
feature-complete on disk but the live counter was dark. This session closes that gap.

## What was done

1. **Verified the uncommitted web build is sound.** `npm run build` on `web/` passes
   clean — 13 static routes (six pages + `_not-found` + the six generated metadata
   routes: `icon`, `apple-icon`, `opengraph-image`, `sitemap.xml`, `robots.txt`).
   TypeScript checks pass. This confirms the 26 still-uncommitted Stage 3/4 files
   are internally consistent and safe to commit.

2. **Deployed the backend to production.** `wrangler deploy` from the working tree
   (which matches the about-to-be-committed `backend/src/index.ts`). New version
   `c0df2644-3f2b-45ce-9163-ee9d314e6f90` at
   `https://auris-backend.aurisapi.workers.dev`, KV `CONVERSATIONS` bound.

3. **Verified the live endpoint.** `GET /reserve/count` now returns **HTTP 200**
   `{"count":0}` with `Cache-Control: public, max-age=60` — exactly the contract the
   `WaitlistCount` component expects. At `count:0` the badge correctly shows the
   "Be among the first to reserve yours" nudge (threshold = 25), so the live site
   shows intentional copy, not a broken or zeroed number.

4. **Repo hygiene.** Removed the stale empty `~/auris-web` stub directory (the site
   has lived at `auris/web/` since the Step-0 move; the old path was a leftover).
   Confirmed `firmware/.pio/` is already gitignored (committed `ded739d`).

## Why it matters

The site can now go live with a working, honest social-proof counter instead of a
silently-dead one. Because the deploy was taken from the same working-tree source
that will be committed, the committed code and the deployed Worker are identical —
no re-deploy is needed after the commit lands.

## Status

- **Backend:** version `c0df2644…`, `/reserve` and `/reserve/count` both live and
  verified. Waitlist currently empty (`count:0`).
- **Web:** build green, 13 routes, ready to commit (commit plan unchanged except the
  addition of this report).

## Follow-ups (owner: Ahmet/Selim)

- Run the commit plan (`~/Desktop/auris-web-commit-plan.txt`) — Stage 3/4 web files
  + reports 08–11 + the backend endpoint.
- Verify the Plausible domain (`aurisai.com`) in the dashboard before launch.
- Fill the 3× `REPLACE_ME` LinkedIn URLs on the About team cards.
- Physical BLE bring-up (hardware-gated, no code change) and `eas.json` `ascAppId`
  (needs the App Store Connect app record) remain the only open device-side items.
