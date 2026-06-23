# 05 — Team Links & Conversion Bundle Reinstated

**Goal:** finish the two loose ends the site went live with — the placeholder team
links on `/about`, and the conversion bundle that was authored in Stage 4 but
rolled back (in a parallel git terminal) before it reached the codebase. The
backend already exposed `GET /reserve/count`; the front end just never consumed it.

This is a small, surgical session: real social links with a deliberate emphasis
on GitHub, plus the re-instatement of four dropped pieces. Covers *what*, *how*,
and *why*.

---

## What changed (at a glance)

**Team / About**
- **Real social links.** The three `REPLACE_ME` LinkedIn placeholders are gone.
  Ahmet → `ahmet-selim-fedakar`, Atilla → `atilla-kaan-alkan-081b65194`. Mete has
  no LinkedIn, so his card simply carries no social links (no dead pill).
- **GitHub promoted over LinkedIn.** For the two engineers, GitHub is the signal
  worth clicking — so it renders as a *featured* gold pill with a small star badge
  in the top-right corner, while LinkedIn stays a quiet hairline pill. This is a
  deliberate hierarchy: "look at the work, not the résumé."
- **Atilla's personal site.** A new `Website` pill (globe icon) links to
  `atillaalkan.com` between his GitHub and LinkedIn.
- The team data moved from loose `linkedin`/`github` fields to a typed
  `links: TeamLink[]` array, so each member can carry any subset of
  github / website / linkedin in order, each optionally `featured`.

**Conversion bundle (reinstated — was reverted pre-commit in Stage 4)**
- **Live waitlist counter.** `reserveCount()` is back in `lib/reserve.ts` (reads
  `GET /reserve/count`, fails soft to 0). `components/WaitlistCount.tsx` is
  re-created and wired under the non-compact reserve form: it shows
  "Join N+ already on the waitlist" past a threshold of 25, and the honest
  "Be among the first to reserve yours" nudge while the number is still small.
- **`alreadyReserved` success state.** `reserve()` now returns the backend's
  `alreadyReserved` flag, and the form's success card distinguishes a fresh
  signup from an email that was already on the list.
- **Accessibility.** Global gold `:focus-visible` ring + `:target` scroll-margin
  restored to `globals.css`.
- **Route scroll-reset.** `SmoothScroll.tsx` now resets to the top on every route
  change (Lenis suppresses the browser's native scroll restoration), using the
  Lenis instance when present and `window.scrollTo` under reduced motion.

---

## How

- **Featured pill + star badge.** A `StarBadge` (absolutely positioned gold disc
  with an SVG star, soft gold glow) sits in the pill's top-right; the pill itself
  uses `border-gold/60 bg-gold/10` with a faint gold box-shadow. A `LinkIcon`
  switch renders the GitHub / LinkedIn / globe SVG by `link.type`.
- **Counter safety.** Both `reserveCount()` and `WaitlistCount` fail silent — a
  network hiccup renders nothing rather than breaking the form. The count is read
  once on mount with an `alive` guard against setState-after-unmount.
- **Scroll-reset placement.** A second `useEffect` keyed on `usePathname()` holds
  the Lenis instance in a ref so the reset works in both the smooth and
  reduced-motion paths.

## Why

- The site was already live with `REPLACE_ME` links — these are the first thing a
  curious investor or hire clicks. Fixing them was the highest-leverage tiny edit.
- The `/reserve/count` endpoint was deployed and verified (200 `{"count":0}`) but
  had **no consumer** after the Stage-4 revert. Re-wiring it turns real backend
  work into visible social proof at zero extra infra cost.

---

## Verification

- `npm run build` passes clean — **13 routes**, no type or client/server boundary
  errors (Next typechecks untracked files too, so this also covers the new
  `WaitlistCount.tsx`).
- Dev server on `:8083` serves `/` and `/about` 200 after a clean `.next`.

## Gotchas (unchanged, re-confirmed)

- `next build` invalidates the live dev `.next` → Turbopack then panics with
  "Next.js package not found". Fix: `rm -rf .next` and restart `next dev -p 8083`.

## Files touched

`app/about/page.tsx` · `lib/reserve.ts` · `components/WaitlistCount.tsx` (new) ·
`components/ReserveForm.tsx` · `app/globals.css` · `components/SmoothScroll.tsx`
