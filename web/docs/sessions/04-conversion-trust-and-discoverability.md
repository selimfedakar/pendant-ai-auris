# 04 — Conversion, Trust & Discoverability (Stage 4)

**Goal:** take the navigable Stage-3 site and add the layer that separates a
"nice landing page" from a *premium product launch*: social proof, objection
handling, share-ready metadata, search discoverability, privacy-first analytics,
accessibility, and a couple of motion details that make the thing feel alive.

This was a focused polish pass against an expert checklist — eleven items, ten
shipped this session (one deferred for a missing asset). Covers *what*, *how*,
and *why* so any teammate can follow.

---

## What changed (at a glance)

**Conversion & trust**
- **Live waitlist social proof.** A new public `GET /reserve/count` on the Worker
  returns the real waitlist size; the form shows "Join N+ already on the
  waitlist" — and gracefully shows "Be among the first" while the number is small.
- **Honest expectation copy + richer success state.** The form now says exactly
  what happens ("We'll email you once, at launch — no spam"), and the success
  card distinguishes a fresh signup from an already-reserved email.
- **FAQ section.** The five questions that actually block a reservation —
  price, "is it always recording?", battery, data, returns — as an accessible
  accordion on the landing page.

**Polish & perception**
- **Designed OG / share card.** `app/opengraph-image.tsx` generates a branded
  1200×630 card (orb + wordmark + tagline) instead of a blank link preview.
- **Orb favicon + theme color.** `app/icon.tsx` / `app/apple-icon.tsx` render the
  gold-orb identity; the default Next favicon was removed; `theme-color` set.
- *(Deferred)* photoreal product render — layout is ready, asset not in hand.

**Discoverability & robustness**
- **SEO base kit.** `app/sitemap.ts`, `app/robots.ts`, a title template, canonical,
  and JSON-LD (`Organization` + `Product` offer) in the layout.
- **Privacy-first analytics.** Plausible (no cookies) — matches the product's
  own privacy promise.
- **Accessibility pass.** A global gold `:focus-visible` ring, form `aria-label`s,
  `role="status"`/`role="alert"` on form feedback, `:target` scroll-margin.

**Motion & feel**
- **Hero micro-interaction.** The orb leans a few pixels toward the cursor
  (spring-smoothed), layered under its existing float — a faint sign of life.
- **Cross-route fade + scroll reset.** Navigating between pages now fades the new
  route in and snaps Lenis back to the top, so the site feels like one app.

---

## How it was built

### 1. Waitlist counter (backend + frontend)

- **Backend** `backend/src/index.ts` — **new** `GET /reserve/count`: paginates the
  KV `list({ prefix: "reserve:" })` until exhausted, sums the keys, and returns
  `{ count }` behind a 60s edge cache so a viral spike can't hammer KV. No API
  key, same as the existing `POST /reserve`.
- **Frontend** `lib/reserve.ts` — **new** `reserveCount()` (best-effort, returns
  `null` on any failure). `components/WaitlistCount.tsx` — **new** client island
  that fetches the count and renders the social-proof line *only* once it's
  meaningful (≥ 25), otherwise a "be among the first" nudge. It fails silent, so
  it can never break the form.

**Why:** an empty email box converts worse than one that shows momentum. The
count is *real* — no vanity inflation — and the threshold keeps it from showing a
weak "Join 3" early on.

### 2. Expectation copy + success state (`components/ReserveForm.tsx`)

`lib/reserve()` now returns `{ ok, alreadyReserved }` (the backend was already
idempotent). The form's success card branches on it ("You're on the list." vs
"You're already on the list.") and every state spells out the contract: one
email, at launch, no spam.

**Note on double opt-in:** a true confirm-your-email flow needs an email provider
(API key + sending domain), which isn't wired yet — so this session ships the
*expectation copy* and *confirmation UI*, and double opt-in is deferred until the
sending infra exists.

### 3. FAQ (`components/sections/Faq.tsx`)

A native `<button aria-expanded>` disclosure accordion with a Framer
height/opacity reveal. Added to the landing page between Pipeline and ReserveCta.
The copy is deliberately objection-handling: the price split, the always-on
privacy question (the make-or-break for a wearable mic), battery, data ownership,
returns.

### 4. OG image & icons (`next/og` `ImageResponse`)

Three generated-image routes, all statically optimized at build time:
- `app/opengraph-image.tsx` — 1200×630 share card: radial warm-dark background,
  three concentric gold rings, a glowing core, wordmark + tagline.
- `app/icon.tsx` (32×32) and `app/apple-icon.tsx` (180×180) — the orb on the dark
  base. The scaffold `app/favicon.ico` was **deleted** so the orb icon is primary.

### 5. SEO (`app/sitemap.ts`, `app/robots.ts`, JSON-LD)

`MetadataRoute.Sitemap` / `MetadataRoute.Robots` generate `/sitemap.xml` and
`/robots.txt` from a single route list. The layout gained a `title.template`
(`%s — Auris`), `alternates.canonical`, and an inlined `application/ld+json`
`Organization` node carrying the `Product` + `$199` offer.

### 6. Analytics, a11y, motion

- **Plausible** via `next/script` (`strategy="afterInteractive"`, `data-domain`).
- **Focus ring** as a global `:focus-visible` rule in `globals.css` (gold, only on
  keyboard focus); form inputs get `focus-visible:ring`.
- **Hero parallax**: `useMotionValue` → `useSpring`; a `pointermove` listener maps
  cursor position to a ±22px lean, *guarded by `prefers-reduced-motion`*. Layered
  as an outer (parallax) + inner (float) `motion.div` so the two transforms don't
  fight.
- **Route transition**: `components/PageTransition.tsx` keys a fade on
  `usePathname`; `SmoothScroll` now holds the Lenis instance in a ref and, on
  pathname change, calls `lenis.scrollTo(0, { immediate: true })` +
  `ScrollTrigger.refresh()`.

---

## Why this matters

Stage 3 made the site *complete*; Stage 4 makes it *convert and get found*. Social
proof and a real FAQ remove the two biggest reasons a visitor bounces without
reserving. The OG card and orb favicon mean every shared link looks intentional.
The SEO kit + Plausible mean we can actually see what's working. None of it
touches Mete's story or the art direction — it's the professional finish layered
on top.

---

## Bugs / gotchas hit this session

- **Stale `.next` after the directory move.** The site was `mv`'d from
  `~/auris-web` to `~/auris/web`; the leftover `.next` (built under the old path)
  made Turbopack panic `Next.js package not found`, so the page returned 200 HTML
  but never emitted the client bundle — the browser hung "loading" forever.
  *Root cause:* `.next` caches absolute paths from the build location. *Fix:*
  `rm -rf .next` and restart `next dev -p 8083`. (Also true after any
  `npm run build`, per report 03.)
- **`favicon.ico` vs `icon.tsx` both emitted.** With both present, the browser
  preferred the legacy `.ico` for the tab, so the new orb icon didn't show.
  *Fix:* delete the scaffold `app/favicon.ico`; `icon.tsx` then becomes primary.

---

## Status

- `npm run build` **passes clean** — TypeScript OK, **13 static routes** (the six
  pages + `_not-found` + the six generated metadata routes: `opengraph-image`,
  `icon`, `apple-icon`, `sitemap.xml`, `robots.txt`).
- Dev verified on **:8083**: all pages 200; `/opengraph-image`, `/icon`,
  `/apple-icon`, `/sitemap.xml`, `/robots.txt` all 200; FAQ, social-proof line,
  expectation copy, JSON-LD, theme-color and orb icon all present in the HTML.
- `GET /reserve/count` is **new code, not yet deployed** — the live call 404s
  until the backend is redeployed, and `WaitlistCount` correctly renders nothing
  until then (fail-silent).

## Follow-ups / open

- **Deploy the backend** so `/reserve/count` goes live
  (`cd backend && nvm use 22 && node_modules/.bin/wrangler deploy`).
- Wire **double opt-in** once an email provider is chosen.
- Verify the **Plausible** domain in the dashboard before launch.
- Drop in the **photoreal product render** when available (deferred item #6).
- Final device eyeball of the FAQ + hero parallax at 390px / 1440px.
