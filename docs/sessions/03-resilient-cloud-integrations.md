# Session 03 — Resilient Cloud Integrations: TTS, Ambient Summary, Gmail, Calendar

**Date:** May 31, 2026
**Theme:** Make the cloud pipeline *robust* (don't let TTS failures kill a reply), and add
the first real third-party integrations — Gmail and Calendar — plus the ambient session
summary.

---

## Goal

A demo that works once isn't a product. This session is about resilience and reach: the
pipeline must degrade gracefully when one provider fails, the ambient ("Social") mode must
produce a summary, and the app must start reading real context from the user's life
(email + calendar).

## What was built

### TTS made non-fatal (resilience)
- `/v1/process-audio-json` now returns the transcript + reply **even if TTS fails**, with
  header `X-TTS-Skipped: 1`.
- App side: when the TTS buffer is empty, skip `audioUri` instead of crashing the playback
  path; show an "audio unavailable" badge.
- **Why this matters:** TTS providers rate-limit. Without this, a rate-limited voice
  response would take the *entire* reply down. Now text always arrives; voice is
  best-effort. (Commits `5b1eb22`, `5abde2f`.)

### `/v1/summarize` + 10-minute ambient session
- New endpoint that summarizes an accumulated ambient transcript.
- `SocialModeService` now accumulates transcripts over a session and requests a summary —
  the payoff of Social Mode is "here's what mattered in the last 10 minutes," delivered as
  a silent notification. (Commit `238e268`.)

### Gmail OAuth + Email Intel module
- `GmailService.ts`: OAuth token flow (`expo-auth-session` + `expo-web-browser` +
  `expo-crypto`), pulls the last 10 inbox emails as LLM context.
- Purpose: lets the companion answer "anything important in my inbox?" — the first proof
  that Auris reaches into real productivity surfaces, not just chit-chat.

### Calendar integration hardening
- Migrated `CalendarService` to **`expo-calendar/legacy`** API.
- *Why:* the new module API surface was unstable on SDK 56; the legacy import is the
  reliable path for read access. (Commit `191d157`.)

### Visual feedback polish
- Vision hint animation, module activation feedback, "audio unavailable" badge, crimson
  side-node styling.

## Errors & fixes

- **Rate-limited TTS killing whole replies** → made TTS non-fatal with `X-TTS-Skipped`
  (above). This is the architectural ancestor of the on-device fallback added in Session
  07 — same problem, progressively stronger fix.
- **Gmail context errors invisible** → added explicit error surfacing + an auth-session
  guard so a half-finished OAuth flow can't wedge the UI. (Commit `01815d5`.)

## Purpose / what it serves

This session is where Auris stops being a toy voice loop and becomes an assistant with
*context* — your inbox and your calendar — while learning to survive partial cloud
failures. Both are prerequisites for a paid product.

## State at end of session

- TTS failures no longer break replies.
- Ambient Social Mode produces summaries.
- Gmail + Calendar feeding real context into the LLM.
- Native modules added (OAuth/crypto/browser) → a new EAS build needed for partner
  devices.
