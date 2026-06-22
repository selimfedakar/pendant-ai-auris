# 03 — Multi-Page Site & Working Navigation (Stage 3)

**Goal:** take the single knockout landing page from Stages 1–2 and turn it into a
real, navigable product site — the way EXCAR's site has About/Privacy/etc. Every
button and link should go somewhere real; the hero should show the actual pendant;
the brand should carry consistently across interior pages.

This report covers *what* was built, *how*, and *why*, so any teammate can follow.

---

## What changed (at a glance)

- **Real pendant in the hero.** The hero background is now the `Pendant` (cord +
  bail + gold body + engraved sound-rings), gently floating, instead of the bare
  `SoundRings` aura.
- **The site is now multi-page.** Five new routes, all statically prerendered:
  `/how-it-works`, `/specs`, `/about`, `/privacy`, `/terms`.
- **Global Nav + Footer.** Both moved into the root layout, so every page —
  landing and interior — shares the same chrome.
- **Route-aware navigation.** The nav uses real `next/link` routes with active
  states, a working mobile menu, and a thin gold scroll-progress thread.
- **Every link resolves.** No more dead `aurisai.com/privacy` external link or
  home-only hash anchors that break on sub-pages.

---

## How it was built

### 1. Shared chrome in the layout

Previously `Nav` lived in `app/page.tsx` and the footer was baked into the
`CtaFooter` section — both home-only. For a multi-page site the chrome has to be
global, so:

- `components/Footer.tsx` — **new** shared footer (brand blurb + Product/Company
  link columns + legal line), using `next/link`.
- `app/layout.tsx` — now renders `<Nav />` and `<Footer />` around `{children}`,
  inside `<SmoothScroll>`. Lenis/GSAP still drive scrolling for the whole app.

**Why:** the layout is the one place every route passes through, so the nav and
footer are guaranteed identical and there's no per-page wiring to forget.

### 2. Reserve form, extracted and reused

- `components/ReserveForm.tsx` — **new**: the email-capture form + loading /
  success / error states, lifted out of the old `CtaFooter` so it can be dropped
  anywhere (the landing CTA and the foot of each sub-page).
- `components/sections/ReserveCta.tsx` — **new**: the landing's closing reserve
  moment (brand line + price + `ReserveForm`). Replaces `CtaFooter` (deleted),
  which previously mixed the CTA *and* the footer in one file.
- `components/PageCta.tsx` — **new**: a tighter reserve band reused at the bottom
  of How-it-works / Specs / About so interior pages always end on the waitlist.

**Why the split:** one source of truth for the reserve form means the backend
contract (`lib/reserve.ts → POST /reserve`) is wired once and reused, not copied.

### 3. Route-aware Nav (`components/Nav.tsx`, rewritten)

- Links are now real routes: **How it works → /how-it-works**, **Specs →
  /specs**, **About → /about**; logo → `/`; Reserve → `/#reserve` (works from any
  page — Next navigates home then scrolls to the anchor).
- `usePathname()` drives **active link** styling and forces the solid nav
  background on interior pages (the transparent-over-hero treatment only makes
  sense on `/`).
- **Mobile menu**: a hamburger toggles a slide-down panel (animated `max-height`);
  it auto-closes on route change via a `pathname` effect.
- **Scroll progress**: a 1px gold line along the nav's bottom edge, driven by
  Framer Motion `useScroll` → `useSpring` (`scaleX`). Subtle, premium, ties the
  pages together.

### 4. Interior-page building blocks

- `components/PageHeader.tsx` — **new**: consistent interior header (clears the
  fixed nav, eyebrow + display title + lead, faint SoundRings glow). Server
  component.
- `components/Reveal.tsx` — **new**: a generic `whileInView` fade-up wrapper. This
  is the trick that lets the **pages stay Server Components** (so they can
  `export const metadata`) while still getting the site's signature entrance —
  the only client island is `Reveal` itself.

### 5. The five pages (all server components, all with metadata/OG titles)

- **`/how-it-works`** — the 3-layer architecture told properly: Pendant (dumb
  sensor) → iPhone (brain) → Cloud (heavy lifting), then the five-step pipeline
  (speak → STT → reasoning → voice → captured todos/events).
- **`/specs`** — hardware spec groups (sensors / connectivity / wear), the two
  modes (Solo / Social), and a pricing block ($199 device + $14.99/mo).
- **`/about`** — the "software company that happens to make jewelry" story, three
  principles, and the **real team** (Ahmet Selim Fedakar — Engineering, LA; Mete
  Selçuk Şimşek — Business, Boston; Atilla Alkan — AI Research, Cambridge).
- **`/privacy`** — a genuine privacy policy grounded in the real architecture
  (audio/image capture, AI processors, short rolling KV history, on-device token
  storage, "Clear All Data" deletion). **This is the page the iOS app's
  `aurisai.com/privacy` placeholder points to** — so once deployed it's no longer
  a dead link.
- **`/terms`** — device + subscription terms, acceptable use, AI-output
  disclaimer, cancellation, liability.

---

## Why this matters

The product story Mete is driving needs more than a single scroll: investors and
press click into *About*, *How it works*, and *Privacy*. Stage 3 makes those real
and on-brand, and closes the loop with the app (the privacy URL now resolves).

---

## Bugs / gotchas hit this session

- **Dev server died after `npm run build`.** Running a production `next build` in
  the same project directory invalidates the `.next` the dev server is serving, so
  the background dev process on :8083 started returning `000`. *Root cause:* build
  and dev share `.next`. *Fix/standard:* restart `next dev -p 8083` after every
  build; don't build against a live dev `.next`. (Not a code bug — a workflow note
  for anyone running build + dev side by side.)
- **Server Components can't use Framer Motion directly** (it needs `'use client'`),
  but client components can't `export const metadata`. *Resolution:* keep each
  page a Server Component for metadata and push all animation into the `Reveal`
  client wrapper it renders. This is why `Reveal` exists rather than marking whole
  pages `'use client'`.

---

## Technical deep-dive (for the engineering record)

### The Server/Client boundary is the whole design

Next 16 App Router defaults every file to a **Server Component**. Two hard rules
shape this session's architecture:

1. Only Server Components may `export const metadata` (per-page `<title>`/OG).
2. Anything using a hook or a browser API (`framer-motion`, `useState`,
   `usePathname`, Lenis) **must** be a Client Component (`'use client'`).

A naive multi-page build marks each page `'use client'` to get animations — and
immediately loses per-page metadata. The fix is to invert it: **pages stay Server
Components**, and the only client islands are small, reusable wrappers
(`Reveal`, `ReserveForm`, `Nav`). A Server Component is allowed to *render* a
Client Component, so `app/about/page.tsx` (server, exports metadata) renders
`<Reveal>` (client, runs `whileInView`). This keeps the client JS bundle tiny —
the page's prose ships as static HTML; only the reveal wrappers hydrate.

That single decision is why `Reveal` exists as its own file instead of inline
`motion.div`s in each page.

### Why Nav + Footer live in the layout, not the pages

`app/layout.tsx` renders once and wraps every route's `children`. Putting `<Nav/>`
and `<Footer/>` there (inside `<SmoothScroll>`) means:

- The Lenis instance in `SmoothScroll` is created **once** and persists across
  client-side route changes — navigation between pages doesn't tear down and
  rebuild the smooth-scroll engine, so there's no scroll-jank on transitions.
- There is exactly one source of the chrome; a new page can never forget it.

The tradeoff: `ProductShowcase`'s GSAP `ScrollTrigger.create({ pin: true })` is
page-local and **must** clean itself up on unmount, or a stale pinned trigger
would leak when you navigate away. It already does this via
`return () => ctx.revert()` in its effect — worth preserving.

### Route-aware nav state (`usePathname`)

The nav's transparent-over-hero treatment only makes sense on `/`. The component
derives `const solid = scrolled || open || pathname !== "/"`, so interior pages
get the frosted background immediately (no flash of transparent nav over a page
that has no hero behind it). The same `pathname` drives active-link styling and,
via an effect, auto-closes the mobile menu on navigation.

### The scroll-progress thread (spring-smoothed)

`useScroll()` gives `scrollYProgress` (0→1, raw, updates every scroll frame).
Binding `scaleX` to it directly looks twitchy on a momentum-scrolled page. Passing
it through `useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })`
adds a critically-ish-damped follow so the gold line *eases* toward the true
progress instead of snapping — which matches the Lenis inertia rather than fighting
it. The line is a 1px `transform-origin: left` element scaled on the X axis, so it
animates on the compositor (no layout/paint), staying off the main thread.

### Output shape

`next build` reports all seven routes as `○ (Static)` — every page, including the
legal pages and the animated landing, is **prerendered to static HTML at build
time**. The interactivity (Lenis, GSAP scrub, reveals, the reserve POST) hydrates
on top. This is the cheapest possible hosting profile (pure static + a client
runtime) and is why a Vercel/any-static deploy is trivial.

## Status

- `npm run build` **passes clean** — 7 static routes (`/`, `/about`,
  `/how-it-works`, `/privacy`, `/specs`, `/terms`, `/_not-found`), TypeScript OK,
  no client/server boundary errors.
- Dev verified on **:8083** (app's Metro stays on 8082): every route returns 200,
  nav/footer links resolve, hero renders the real pendant, team + pricing +
  privacy content present.
- Not visually screenshotted by Claude this session (no browser MCP) — Selim
  eyeballs at `localhost:8083`.

## Follow-ups / open

- Swap the SVG `Pendant` for a photoreal render when available (drop-in).
- Final device eyeball of the new pages at 390px / 1440px.
- Optional Vercel preview deploy.
- Update the commit plan: this session adds new files (Footer, ReserveForm,
  ReserveCta, PageHeader, PageCta, Reveal, five pages) and **deletes**
  `components/sections/CtaFooter.tsx`.
