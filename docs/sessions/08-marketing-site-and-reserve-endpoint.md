# 08 — Marketing Site & Public Reserve Endpoint

**Date:** June 14, 2026
**Theme:** A premium scroll-animated landing site for Auris, plus a public reservation
capture endpoint on the existing Cloudflare Worker.

This session has two halves. The bulk — the marketing website — lives in a **separate
repository** (`~/auris-web`) so it never entangles the app/backend/firmware monorepo.
The one change inside *this* repo is a new public `/reserve` endpoint that the website's
waitlist form posts to. This report documents both, since the endpoint is part of the
live Auris backend.

---

> **Detailed site build journal:** this is the monorepo-level summary. The section-by-section
> account of how the website was built lives in `web/docs/sessions/` (reports 00–02).

## 1. The marketing site (`web/` subproject)

### What was built

A single, knockout landing page built to a "fieldy.ai-grade" quality bar: momentum
(smooth) scrolling and scroll-driven animation, with Auris's own art direction.

- **Art direction — *warm luminous dark*.** Near-black base (`#0A0A0B`), warm gold accent
  (`#E8B84B` / glow `#FFD98A`). The signature motif is **concentric gold sound-rings
  radiating from a single orb** — the exact in-app orb identity, now the brand's visual
  language on the web.
- **Sections:** Nav (transparent → frosted on scroll) · Hero (staggered headline reveal
  over a pulsing orb) · **Product showcase** (a GSAP-pinned, scroll-scrubbed walk through
  the real `OrbState` machine: idle → listening → thinking → speaking) · Two Modes
  (Solo/Social) · Features (6-card stagger) · Pipeline (the three-layer architecture
  lighting up on scroll) · CTA + Footer (the reserve form).
- **Pendant rendered in code.** Rather than ship a bare placeholder orb, the pendant is
  drawn as an SVG — a necklace cord, a bail, and a gold body whose face carries the
  concentric sound-ring *engraving*. It reads as jewelry, and can be swapped for a
  photoreal render later without touching layout.

### How the technology was created

The fieldy-level feel is a specific toolset, not a single library:

- **Next.js 16 (App Router, Turbopack) + React 19.2 + Tailwind v4** — the base. Tailwind v4
  is configured entirely through CSS `@theme` tokens in `globals.css` (no
  `tailwind.config.ts`); the palette and the `ring-pulse` / `breathe` keyframes live there.
- **Lenis** drives momentum scrolling. A single `<SmoothScroll>` provider runs one
  `requestAnimationFrame` loop that advances Lenis *and* updates GSAP ScrollTrigger, so
  scrubbed animations stay in lockstep with the smoothed scroll position.
- **GSAP + ScrollTrigger** handle the one "hero moment" — pinning the product showcase and
  scrubbing through the orb states as you scroll.
- **Framer Motion** handles the lighter reveal/stagger animations (headline, feature cards).
- **Accessibility:** every animation respects `prefers-reduced-motion` — Lenis is skipped
  entirely, the CSS pulses freeze, and all content stays visible and readable.

### What purpose it serves

It is the public face for the VC/brand story. It is accurate to the real product — every
claim is paraphrased from the product README (two modes, memory, vision, ambient
intelligence, the three-layer architecture, $199 + $14.99/mo), so nothing on the site
overstates what Auris does.

### Stack note (why versions matter)

Next.js 16 ships breaking changes (Turbopack is the default builder; `scroll-behavior`
overrides during navigation were dropped — which is ideal for Lenis). The repo's
`AGENTS.md` enforces reading the embedded `node_modules/next/dist/docs/` before writing
code; that guidance was followed.

---

## 2. Public `/reserve` endpoint (this repo — `backend/src/index.ts`)

### What was done

A new **public** route, `POST /reserve`, was added so the website's waitlist form can
capture emails. It is deliberately **not** under `/v1/*`:

- The `/v1/*` auth middleware is fail-closed and requires the secret `X-Auris-Key`. A
  public marketing form runs in the browser and cannot carry that secret without leaking
  it. So `/reserve` sits outside the guarded prefix and takes no API key.
- CORS is already `origin: "*"` for all routes, so the cross-origin form post works.
- The handler validates the email (regex + 254-char cap), is **idempotent** (re-submitting
  an existing email returns `{ ok: true, alreadyReserved: true }` rather than duplicating),
  and stores each entry in the `CONVERSATIONS` KV namespace under a `reserve:` key prefix
  so the waitlist can be listed later.
- It reuses the same **IP rate-limit pattern** as `/v1/validate-code` (KV-backed sliding
  window), set to 8 requests per IP per 10 minutes to deter abuse.

### How it serves the product

It turns the landing page's primary CTA into a real, working waitlist with zero new
infrastructure — it rides on the Worker and KV namespace we already operate.

### Verification

- `wrangler deploy --dry-run` compiled clean; deployed live (**version
  `e06634bd-0c38-4ced-b2ec-586d2840291a`**) to `auris-backend.aurisapi.workers.dev`.
- Smoke-tested against production: a valid email returns `{ ok: true }`; the same email
  again returns `{ ok: true, alreadyReserved: true }`; an invalid email returns `400`. The
  smoke-test KV key was then deleted so the real waitlist stays clean.
- Website: `npm run build` passes (TypeScript clean, no client/server boundary errors); the
  dev server serves the page with the wired form and the SVG pendant.

### No multi-attempt bugs

Nothing in this session required more than one attempt, so there is no `BUG_LOG.md` entry.

---

## Pending / next

- Swap the SVG pendant for a photoreal product render when available (drop-in; layout is
  ready).
- Mobile (390px) and desktop (1440px) layouts were polished by scaling the orb/pendant/ring
  art at breakpoints and relying on stacking grids; worth a final eyeball pass on devices.
- Optional: a Vercel preview deploy for the site.
- Listing the waitlist: `wrangler kv key list --namespace-id=f56efb1edefc4d7496b4531faccb94f5 --prefix "reserve:" --remote`.
