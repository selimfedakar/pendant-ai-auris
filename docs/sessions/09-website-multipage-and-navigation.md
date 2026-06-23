# 09 — Website: Multi-Page Site & Working Navigation

**Date:** Jun 14, 2026
**Scope:** the marketing website only (`~/auris-web`, to become `web/` in this repo).
The app, backend, and firmware were **not** touched this session.

This is the monorepo-level summary. The full, file-by-file build journal lives in
`web/docs/sessions/03-multipage-and-navigation.md` — read that for the deep technical
walkthrough. This report explains, at the product level, what Stage 3 added and why.

---

## Context

Stage 1–2 (report 08) delivered a single scroll-animated landing page plus the public
`/reserve` waitlist endpoint. A single page is enough to *introduce* Auris, but the
VC/brand story Mete is driving needs the things investors and press actually click
into: **How it works**, **About**, **Privacy**, **Terms**, **Specs/pricing**. Stage 3
turns the landing into a real, navigable site on the same foundation, and makes every
button and link resolve to something real.

## What was built

1. **The real pendant now anchors the hero.** Previously the hero showed only the
   ambient `SoundRings` aura; now it renders the actual `Pendant` (necklace cord, bail,
   gold body with the engraved sound-ring face), gently floating, with the vignette
   retuned so the headline stays legible over it.

2. **Five new pages**, all statically prerendered:
   - `/how-it-works` — the three-layer architecture (pendant → iPhone → cloud) and the
     five-step request pipeline (speak → STT → reasoning → voice → captured todos/events).
   - `/specs` — hardware spec groups, the two modes (Solo / Social), and the pricing
     block ($199 device + $14.99/mo).
   - `/about` — the "software company that happens to make jewelry" story, three
     product principles, and the real team (Ahmet — Engineering, LA; Mete — Business,
     Boston; Atilla — AI Research, Cambridge).
   - `/privacy` — a genuine privacy policy grounded in the **actual architecture**
     (on-device capture, AI processors, short rolling KV history, on-device token
     storage, "Clear All Data" deletion). **This is the page the iOS app's
     `aurisai.com/privacy` placeholder is meant to resolve to** — so once the site
     deploys, that app link is no longer dead.
   - `/terms` — device + subscription terms, acceptable use, AI-output disclaimer,
     cancellation, liability.

3. **Global, working navigation.** Nav and Footer moved into the root layout so every
   page shares them. The nav now uses real client-side routes with active-link states,
   a working mobile hamburger menu, and a thin gold scroll-progress thread.

## Why it matters

- Closes the loop with the **iOS app**: the privacy URL the app ships with now points
  at a real document we control and that accurately describes our data flow — directly
  relevant to App Store review.
- Gives the **fundraise** a credible surface area: a one-pager reads like a demo; a
  site with About/How-it-works/Privacy reads like a company.

## Status

- `web/` `npm run build` passes clean: **7 static routes** (`/`, `/about`,
  `/how-it-works`, `/privacy`, `/specs`, `/terms`, `/_not-found`), TypeScript OK, no
  client/server boundary errors.
- Dev verified on port **8083** (the app's Metro stays on 8082): every route 200s,
  all links resolve, the hero shows the real pendant.
- Nothing committed yet — Ahmet runs all git from the refreshed atomic commit plan on
  the Desktop.

## Open follow-ups

- Swap the SVG pendant for a photoreal render when available (drop-in).
- Host the site (Vercel) so the app's `aurisai.com/privacy` link goes live.
- Optional next pages: FAQ, a press/contact page, an "Auris Inside" B2B page.
