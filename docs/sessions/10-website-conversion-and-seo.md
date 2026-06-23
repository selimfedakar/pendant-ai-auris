# 10 — Website: Conversion, Trust & Discoverability

**Date:** Jun 21, 2026
**Scope:** the marketing website (`web/`) plus one public backend endpoint
(`backend/src/index.ts`). The app and firmware were **not** touched this session.

This is the monorepo-level summary. The full, file-by-file build journal lives in
`web/docs/sessions/04-conversion-trust-and-discoverability.md` — read that for the
deep walkthrough. This report explains, at the product level, what Stage 4 added
and why.

---

## Context

Stage 3 (report 09) turned the landing page into a real, navigable site. That made
it *complete* — but a complete site still isn't a *launch-grade* one. Stage 4 is a
focused polish pass against an expert checklist of eleven items, ten shipped
(one deferred for a missing asset), grouped into conversion, perception,
discoverability, and feel.

## What was built

1. **Live waitlist social proof.** New public `GET /reserve/count` on the Worker
   counts the real `reserve:` KV keys (paginated, 60s edge cache) and the form now
   shows "Join N+ already on the waitlist" — with an honest "Be among the first"
   fallback while the number is small. No vanity inflation.

2. **Honest expectation copy + a smarter success state.** The form spells out the
   contract (one email, at launch, no spam) and distinguishes a fresh signup from
   an already-reserved address. *Double opt-in* (confirm-your-email) is deferred
   until an email-sending provider is wired.

3. **An objection-handling FAQ** on the landing page: price split, the
   make-or-break "is it always recording?" privacy question, battery, data
   ownership, returns — as an accessible accordion.

4. **A designed share card and a brand favicon.** `opengraph-image.tsx` generates
   a 1200×630 card (orb + wordmark + tagline); `icon.tsx` / `apple-icon.tsx`
   render the gold-orb identity; the scaffold favicon was removed.

5. **An SEO base kit**: generated `sitemap.xml` + `robots.txt`, a title template,
   canonical URL, and `Organization`/`Product` JSON-LD.

6. **Privacy-first analytics** (Plausible, no cookies) — aligned with the
   product's own privacy promise.

7. **An accessibility pass**: a global gold keyboard focus ring, form ARIA labels,
   live-region form feedback.

8. **Two motion details**: the hero orb now leans faintly toward the cursor
   (reduced-motion-guarded), and route changes fade in + snap scroll to top, so
   the multi-page site feels like one continuous app.

9. **Team cards rebuilt in the excar-web format** but with Auris tokens: real
   photos, role, bio, and LinkedIn/GitHub links (Atilla's bio updated to his real
   Harvard-Smithsonian / NASA ADS research role).

## Deferred

- **Photoreal product render** — the hero/showcase layout is ready; the asset
  isn't in hand yet (drop-in when it is).
- **Double opt-in email** — needs an email provider (sending domain + API key).

## Why it matters

Social proof and a real FAQ remove the two biggest reasons a visitor leaves
without reserving; the OG card and favicon make every shared link look
intentional; the SEO kit + analytics let us see what converts. None of it
disturbs the story or the art direction — it's the professional finish on top.

## Status

- `npm run build` passes clean — 13 static routes (six pages + `_not-found` + six
  generated metadata routes).
- Verified on `:8083`. **`GET /reserve/count` is new code, not yet deployed** — the
  live call 404s until `wrangler deploy`, and the counter UI fails silent until
  then.

## Follow-ups

- Redeploy the backend so `/reserve/count` is live.
- Verify the Plausible domain before launch; wire double opt-in when email sending
  exists; drop in the product render when available.
