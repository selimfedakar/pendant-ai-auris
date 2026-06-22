# Auris Website — Build Journal

This folder is the **engineering build journal** for the Auris marketing website
(`web/` in the monorepo). It reconstructs how the site was built, in order, so any
teammate — Mete (business/brand), Atilla (research), Ahmet (engineering) — can follow
*what was built, how, and why*.

It mirrors the convention of the main app/backend journal in `../../docs/sessions/`.

## Index

| # | Report | Theme |
|---|--------|-------|
| 00 | [Foundation & Design System](00-foundation-and-design-system.md) | Next 16 + Tailwind v4 scaffold, design tokens, Lenis+GSAP smooth-scroll engine, the SoundRings motif |
| 01 | [The Landing Page (Sections)](01-landing-page-sections.md) | Nav, Hero, pinned Product Showcase, Two Modes, Features, Pipeline, CTA + Footer |
| 02 | [Pendant, Live Reserve & Responsive](02-pendant-reserve-and-responsive.md) | SVG pendant, public /reserve waitlist endpoint, breakpoint polish |
| 03 | [Multi-Page Site & Working Navigation](03-multipage-and-navigation.md) | Stage 3: real pendant in hero, global Nav/Footer in layout, How-it-works / Specs / About / Privacy / Terms pages, route-aware nav with mobile menu + scroll progress |
| 04 | [Conversion, Trust & Discoverability](04-conversion-trust-and-discoverability.md) | Stage 4: live waitlist counter (`/reserve/count`), FAQ, expectation copy, generated OG card + orb favicon, SEO (sitemap/robots/JSON-LD), Plausible, a11y focus ring, hero cursor parallax + cross-route fade, excar-style team cards |

## The stack (one line)

Next.js 16 (App Router, Turbopack) · React 19.2 · Tailwind v4 (CSS `@theme`, no config file) ·
Lenis (momentum scroll) · GSAP + ScrollTrigger (pinned/scrubbed) · Framer Motion (reveals) ·
Sora + Inter fonts. Art direction: warm luminous dark, gold sound-ring orb identity.

## Live infrastructure

- **Reserve endpoint:** `POST https://auris-backend.aurisapi.workers.dev/reserve` (public,
  no API key, CORS-open, IP rate-limited, idempotent, stores KV `reserve:<email>`).
- **Site:** static Next.js app, deploy target Vercel.
