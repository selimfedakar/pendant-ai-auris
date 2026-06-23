# Auris — Build Journal (Session Reports)

This folder is the **engineering build journal** for Auris. It reconstructs how the
product was built, session by session, from the first commit to the current state.

**Purpose:** every teammate — Mete (business/product), Atilla (AI research), Ahmet
(engineering) — should be able to open this folder and understand *what was built,
why it was built that way, what each technology serves, and how every non-trivial bug
was diagnosed and fixed*. It is also the personal know-how record for the engineering
lead.

## Working rule (new, from Session 5 onward)

> At the end of **every** working session, a new `NN-title.md` report is added here.
> Written in English (this repo is public and shared with investors/partners).
> It must explain, for each piece of work: **what was done, how the technology was
> created, what purpose it serves, and — for any multi-attempt bug — the symptom, the
> root cause, and the fix.**

This complements the existing `docs/BUG_LOG.md` (bug-only, cross-cutting) and the
architecture references (`docs/ARCHITECTURE.md`, `docs/VOICE_SOCIAL_TECHNICAL.md`).

## The three-layer architecture (the spine of everything below)

Every session decision traces back to one non-negotiable design:

1. **Pendant = dumb sensor.** Mic, camera, speaker, BLE stream. No intelligence.
2. **iOS App = the brain.** Routing, memory, integrations (calendar/email), UI, state.
3. **Cloud AI = heavy lifting.** STT (Groq Whisper) → LLM (Claude Haiku) → TTS (Groq
   Orpheus / OpenAI Nova).

Keeping intelligence off the device is what makes the hardware cheap ($199 target) and
lets us upgrade the "brain" without ever touching what hangs around the user's neck.

## Index

| # | Report | Dates | Theme |
|---|--------|-------|-------|
| 00 | [Foundation & Backend AI Pipeline](00-foundation-and-backend-pipeline.md) | May 28 | Monorepo, Cloudflare Workers STT→LLM→TTS pipeline |
| 01 | [Services & State Layer](01-services-and-state-layer.md) | May 29 | Audio/VAD, backend client, profile, history, social loop |
| 02 | [UI System & Stability Fixes](02-ui-system-and-stability-fixes.md) | May 30 | Orb, waveform, canvas, screens + first critical fixes |
| 03 | [Resilient Cloud Integrations](03-resilient-cloud-integrations.md) | May 31 | TTS-non-fatal, ambient summary, Gmail, calendar |
| 04 | [Identity, UX Polish & ESP32 Endpoint](04-identity-ux-and-esp32-endpoint.md) | Jun 1 | UUID identity, device codes, camera UX, privacy, PCM endpoint |
| 05 | [Calendar Sync, Canvas & Social Hardening](05-calendar-canvas-social-hardening.md) | Jun 2–6 | Calendar confirm card, draggable canvas, multilingual voice |
| 06 | [Hardware Bridge: Firmware + BLE](06-hardware-bridge-firmware-ble.md) | Jun 7–8 | ESP32S3 firmware, BLE GATT client, PCM pipeline |
| 07 | [App Store Readiness, Security & On-Device Voice](07-appstore-security-on-device-voice.md) | Jun 10–11 | Fail-closed auth, onboarding gate, expo-speech fallback |
| 08 | [Marketing Site & Public Reserve Endpoint](08-marketing-site-and-reserve-endpoint.md) | — | Scroll-animated landing site, public /reserve waitlist endpoint |
| 09 | [Website: Multi-Page Site & Navigation](09-website-multipage-and-navigation.md) | — | Real pendant hero, How-it-works / Specs / About / Privacy / Terms, route-aware nav |
| 10 | [Website: Conversion, Trust & Discoverability](10-website-conversion-and-seo.md) | — | Waitlist counter, FAQ, OG card + orb favicon, SEO, Plausible, a11y, route fade |
| 11 | [Website Go-Live: Backend Deploy & Verification](11-website-golive-and-backend-deploy.md) | — | Backend deploy, /reserve & /reserve/count live, end-to-end verification |
| 12 | [Pendant Hands-Free Trigger](12-pendant-hands-free-trigger.md) | Jun 22 | Board mic over BLE, on-board button event, press-to-talk |
| 13 | [Website: Team Links & Conversion Reinstated](13-website-team-links-and-conversion-reinstated.md) | Jun 23 | Real team social links (GitHub featured), reinstated waitlist counter / alreadyReserved / a11y / scroll-reset |

## Live infrastructure (current)

- **Backend:** `https://auris-backend.aurisapi.workers.dev` — Cloudflare Workers (Hono).
  Latest deploy version `c0df2644` (Jun 21, rate limiting + public `/reserve` & `/reserve/count` live).
- **Repo:** `github.com/selimfedakar/pendant-ai-auris` (public).
- **App:** Expo SDK 56 / RN 0.85.x, bundle id `com.aurisai.app`.
- **Hardware:** Seeed XIAO ESP32S3 Sense (PlatformIO + Arduino, NimBLE).

## Business context

$199 device + $14.99/mo subscription (B2C), plus an "Auris Inside" B2B licensing play.
The engineering choices in these reports are all in service of a unit economic that
works at consumer scale.
