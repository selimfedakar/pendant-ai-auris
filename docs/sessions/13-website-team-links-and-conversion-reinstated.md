# 13 — Website: Team Links & Conversion Reinstated

**Date:** Jun 23, 2026
**Scope:** marketing website (`web/`), no app/backend/firmware changes.

A short, surgical website session closing the two gaps the site went live with.
The full engineering write-up lives in the website's own build journal at
[`web/docs/sessions/05`](../../web/docs/sessions/05-team-links-and-conversion-reinstated.md);
this is the monorepo-level summary.

## What & why

1. **Real team links on `/about`.** Removed the three `REPLACE_ME` LinkedIn
   placeholders. Ahmet and Atilla now link out for real; Mete (no LinkedIn)
   carries no social pill rather than a dead link. GitHub is deliberately
   promoted over LinkedIn for the two engineers — a *featured* gold pill with a
   star badge — because the work is the stronger signal than the résumé. Atilla
   also gets a `Website` pill to `atillaalkan.com`.

2. **Reinstated the Stage-4 conversion bundle.** These pieces were authored in
   the Stage-4 polish pass but reverted (in a parallel git terminal) before they
   reached the codebase, even though the backend `GET /reserve/count` endpoint was
   deployed and verified. Re-wired the front end to consume it:
   - live waitlist counter (`reserveCount()` + `WaitlistCount`, fails soft),
   - `alreadyReserved` success state on the reserve form,
   - global gold `:focus-visible` ring + `:target` scroll-margin (a11y),
   - route-change scroll-reset in the Lenis smooth-scroll wrapper.

## Verification

- `npm run build` clean — 13 static routes, no type errors.
- Dev server on `:8083` serves `/` and `/about` 200.

## Pending

- Verify the Plausible `aurisai.com` domain in the dashboard (no front-end change
  needed; analytics simply won't record until the domain is confirmed).
- Swap the SVG pendant for a photoreal product render when the asset is in hand
  (layout already drop-in ready).
