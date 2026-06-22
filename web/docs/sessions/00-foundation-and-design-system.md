# Web 00 — Foundation & Design System

**Date:** June 14, 2026
**Theme:** Scaffold the marketing site and build the design system + the smooth-scroll
animation engine that every section relies on.

This is the build journal for the **Auris marketing website**. It is written so any
teammate — Mete (business/brand), Atilla (research), Ahmet (engineering) — can follow
exactly what was built and why. The site is a standalone subproject (`web/`) inside the
Auris monorepo, separate from `app/` and `backend/`.

---

## 1. Why a separate Next.js project

The site does not share code with the React Native app — different runtime, different
build, different deploy target (Vercel vs Expo/Cloudflare). Keeping it as its own
subproject (`web/`, no workspaces) means its dependency tree can never collide with the
app's, exactly like `backend/` already does.

## 2. The stack (and why each piece exists)

The "fieldy.ai-grade" feel — gliding momentum scroll plus scroll-driven animation — is not
one library; it is a specific toolset:

- **Next.js 16 (App Router, Turbopack) + React 19.2** — the base framework. Turbopack is
  the default builder in 16 (no flag needed). Next 16 also *stopped* overriding
  `scroll-behavior` during navigation, which is ideal for a custom smooth-scroll engine.
- **Tailwind CSS v4** — utility styling. v4 has **no `tailwind.config.ts`**; the whole
  design system is declared in CSS via `@theme` tokens in `app/globals.css`.
- **Lenis** — momentum (smooth) scrolling. This is the "gliding" feel.
- **GSAP + ScrollTrigger** — pinned, scroll-scrubbed scenes (used in the next report).
- **Framer Motion** — lighter reveal/stagger animations.
- **next/font** — Sora (geometric display) for headlines, Inter (clean grotesque) for body.

> Note: the repo ships an `AGENTS.md` warning that Next 16 has breaking changes and that
> the embedded docs in `node_modules/next/dist/docs/` should be read before coding. That
> guidance was followed when scaffolding.

## 3. The design system — `app/globals.css`

Art direction is **warm luminous dark**. All of it lives in `@theme` tokens so any
component can use utilities like `bg-base`, `text-gold`, `border-hairline`:

- Palette: base `#0A0A0B`, panel `#141416`, gold `#E8B84B`, glow `#FFD98A`, text `#F5F5F0`,
  muted `#9A9A92`, hairline `rgba(255,255,255,0.08)`.
- Two keyframes drive the signature motif: `ring-pulse` (a ring expanding and fading
  outward) and `breathe` (the core gently scaling). They are exposed as `--animate-*`
  tokens so components reference them by name.
- **Accessibility is built into the foundation:** a `prefers-reduced-motion` media query
  freezes every animation/transition globally, and the Lenis baseline classes are set up so
  smooth scroll can be cleanly disabled.

## 4. The smooth-scroll engine — `components/SmoothScroll.tsx` + `lib/gsap.ts`

- `lib/gsap.ts` registers `ScrollTrigger` **once, client-side only**, and exports a
  `prefersReducedMotion()` helper. Importing GSAP from here (not from `"gsap"` directly)
  guarantees the plugin is registered before any animation runs.
- `SmoothScroll.tsx` is a client provider wrapped around the whole app in the root layout.
  It creates a Lenis instance and runs **one** `requestAnimationFrame` loop — driven by
  GSAP's ticker — that advances Lenis *and* calls `ScrollTrigger.update()`. This single
  shared loop is what keeps scroll-scrubbed animations perfectly in lockstep with the
  smoothed scroll position. Under reduced motion it skips Lenis entirely (native scroll).

## 5. The signature motif — `components/SoundRings.tsx`

The brand's visual signature: a warm gold core (using the `breathe` animation) surrounded
by concentric rings that pulse outward (`ring-pulse`, staggered delays). It is pure CSS, so
it costs nothing on the main thread and freezes gracefully under reduced motion. It is
reused across the hero, the footer, and (engraved) on the pendant.

## Result

A working app shell with fonts, metadata/OG, the design system, the smooth-scroll engine,
and the signature motif — the foundation every section in report 01 builds on.
`npm run build` passes clean.
