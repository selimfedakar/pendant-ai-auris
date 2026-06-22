# Web 02 — Pendant, Live Reserve & Responsive Polish

**Date:** June 14, 2026
**Theme:** Replace the placeholder orb with a pendant rendered in code, wire the reserve
form to a real backend, and polish mobile/desktop layouts.

---

## 1. The pendant, rendered in code — `components/Pendant.tsx`

Instead of shipping a bare orb where the product should be, the pendant is drawn as an SVG
so it reads as jewelry while staying swappable for a photoreal render later (drop-in — the
layout does not change). It composes:

- a thin **necklace cord** (two curved strands) meeting at a **bail** (the loop);
- a **gold body** with a radial-gradient face and a rim highlight (so it looks like metal,
  not a flat disc);
- the **sound-ring signature engraved** onto the face as concentric grooves — tying the
  product back to the "always listening" motif;
- a glowing core and a specular highlight for depth.

The radiating `SoundRings` sit behind it, so the jewelry literally appears to emit sound.
It replaces the placeholder orb inside the **product showcase**; the hero and CTA keep the
bare `SoundRings` as an intentional ambient "aura."

## 2. Reserve form → live backend

The website's primary CTA is now a working waitlist, with **zero new infrastructure** —
it rides on the Cloudflare Worker and KV namespace Auris already operates.

**Backend** (`backend/src/index.ts`, `POST /reserve`):

- Deliberately **not** under `/v1/*`. The `/v1/*` routes are protected by a fail-closed
  API-key middleware; a public marketing form runs in the browser and cannot hold that
  secret. So `/reserve` sits outside the guarded prefix and needs no key. CORS is already
  open (`origin: *`) for all routes.
- Validates the email (regex + 254-char cap), is **idempotent** (re-submitting an existing
  email returns `{ ok: true, alreadyReserved: true }` instead of duplicating), and stores
  each entry in KV under a `reserve:<email>` key.
- Reuses the same KV-backed **IP rate-limit** pattern as `/v1/validate-code`, set to 8
  requests per IP per 10 minutes.

**Frontend** (`lib/reserve.ts` + `components/sections/CtaFooter.tsx`):

- `lib/reserve.ts` POSTs `{ email, source: "web" }` to the endpoint (overridable via
  `NEXT_PUBLIC_RESERVE_URL`, defaulting to the live Worker URL).
- The form has real **loading / success / error** states: the button shows "Reserving…",
  success swaps the form for a confirmation pill, and errors surface inline.

**Verification:** the endpoint was deployed live (Worker version `e06634bd`) and smoke-tested
in production — a valid email returns `{ ok: true }`, a duplicate returns
`{ ok: true, alreadyReserved: true }`, an invalid email returns `400`. The smoke-test entry
was then deleted so the real waitlist stays clean. To read the waitlist later:

```
cd backend && nvm use 22 && node_modules/.bin/wrangler kv key list \
  --namespace-id=f56efb1edefc4d7496b4531faccb94f5 --prefix "reserve:" --remote
```

## 3. Responsive polish (390px / 1440px)

- The fixed-size art (hero rings, the pendant, the CTA rings) is **scaled down at
  breakpoints** (`scale-[…] sm:… lg:…`) so it never gets clipped on small screens.
- All multi-column grids already collapse to a single column on mobile.
- A global `overflow-x: hidden` guarantees the large decorative art can never cause a
  horizontal scrollbar.

## Result

`npm run build` passes clean (TypeScript included, no client/server boundary errors); the
dev server serves the page with the wired form and the SVG pendant. No multi-attempt bugs in
this work, so there is no separate bug entry.

## Pending / next

- Swap the SVG pendant for a photoreal product render when available.
- Final on-device eyeball of the 390/1440 layouts.
- Optional Vercel preview deploy.
- Stage-2 multi-page site on the same foundation.
