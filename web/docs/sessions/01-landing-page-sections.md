# Web 01 — The Landing Page (Sections)

**Date:** June 14, 2026
**Theme:** Build the seven sections of the single-page landing experience on top of the
foundation from report 00.

Every section is a `'use client'` component under `components/sections/` and is composed in
`app/page.tsx`. Copy is paraphrased from the product README, so nothing on the site claims
more than Auris actually does (two modes, memory, vision, ambient intelligence, the
three-layer architecture, $199 + $14.99/mo).

---

## Nav — `components/Nav.tsx`

Fixed at the top, transparent over the hero, and **frosts** (blur + hairline border +
translucent base) once the user scrolls past 24px. A small `useEffect` scroll listener
flips a `scrolled` boolean. Anchor links jump to each section; the gold "Reserve" button
jumps to the CTA.

## Hero — `components/sections/Hero.tsx`

The first impression: the gold `SoundRings` orb pulsing behind the headline, with a vignette
layered over the glow so the type stays legible. The headline *"Always listening. Quietly
yours."* does a **staggered word reveal** — each word is wrapped in an overflow-hidden span
and slides up via Framer Motion `staggerChildren`. The last two words use a gold→glow
gradient text fill. Sub-copy, two CTAs, and an animated scroll cue follow.

## Product showcase — `components/sections/ProductShowcase.tsx`  (the marquee moment)

This is the one "hero moment" and the most technical section. Using GSAP ScrollTrigger, the
section is **pinned** (held in place) while the user scrolls through `+=300%` of scroll
distance, and the scroll progress is **scrubbed** into a state index. As you scroll it walks
through the app's real `OrbState` machine — **idle → listening → thinking → speaking** —
changing the pendant's glow color, the ring count, a progress bar, and the narration text
for each state. It is the product, told as a scroll story. (Under reduced motion the pin is
skipped and the content is simply readable.)

## Two modes — `components/sections/TwoModes.tsx`

Two cards contrasting **Solo Mode** (voice-in/voice-out, memory, vision — gold accent) and
**Social Mode** (silent ambient listening, notify only when it matters — blue accent). They
fade/slide in on scroll via Framer Motion `whileInView`, each with a soft accent glow.

## Features — `components/sections/Features.tsx`

A six-card grid mapped from the README: voice with memory, vision analysis, ambient
intelligence, auto todo/event detection, calendar context, offline-resilient. Cards reveal
with a **staggered** `whileInView` animation (delay keyed to column) and lift on hover.

## Pipeline — `components/sections/Pipeline.tsx`

The three-layer architecture told as a scroll-lit sequence: **Pendant** (a dumb sensor) →
**iOS App** (the brain) → **Cloud** (the heavy lifting). Each layer reveals on scroll along
a vertical connecting line with glowing node dots, alternating sides on desktop. The payoff
line: the pendant stays simple and gets smarter on its own because all intelligence lives in
the app and the cloud.

## CTA + Footer — `components/sections/CtaFooter.tsx`

A final ring pulse behind the brand line *"A software company. It happens to make jewelry."*,
the reserve email form (wired to the backend in report 02), the $199 + $14.99/mo line, and a
footer with anchor + legal links. 

## Composition — `app/page.tsx`

`Nav` plus the seven sections in order. Server component by default; each animated section
opts into the client. `npm run build` passes clean with no client/server boundary errors.
