# Session 00 — Foundation & Backend AI Pipeline

**Date:** May 28, 2026
**Theme:** Stand up the monorepo and the cloud "brain stem" — the STT → LLM → TTS pipeline.

---

## Goal

Before any UI or hardware, we needed the one thing the whole product depends on: a cloud
endpoint that takes audio in and returns *(a) a transcript, (b) an AI reply, and (c)
spoken audio*. Everything else (app, pendant) is a client of this pipeline. So Session 00
is pure foundation: repo scaffolding + the backend.

## What was built

### Monorepo scaffold
- `package.json` (root), `.gitignore`, `README.md`, `LICENSE`.
- Three top-level packages: `app/` (Expo iOS), `backend/` (Cloudflare Workers),
  `firmware/` (added later), plus `docs/`.
- **Decision — no npm workspaces.** Expo and Cloudflare Workers have conflicting peer
  dependency trees; a single hoisted `node_modules` breaks one or the other. Each package
  keeps its own lockfile. This is deliberate, not an oversight.

### Backend: Cloudflare Workers + Hono
- `backend/wrangler.toml` — Worker config. Two things here are load-bearing:
  - `compatibility_flags = ["nodejs_compat"]` — required so `Buffer` exists in the edge
    runtime (audio base64 decoding depends on it).
  - KV namespace binding `CONVERSATIONS` — per-user conversation memory.
- `backend/src/index.ts` — the full pipeline as Hono routes.

**Why Cloudflare Workers?** Edge-deployed, scales to zero, no server to babysit, and
deploys in ~2 seconds with `wrangler deploy`. For a startup that wants global low-latency
without an ops team, this is the cheapest path to "always-on."

### The pipeline (the core asset)
```
audio (base64) ──▶ Groq Whisper (STT, auto language detect)
                       │ transcript
                       ▼
              Claude Haiku (LLM, with KV history + user profile)
                       │ reply (+ todos, +detected events)
                       ▼
              OpenAI / Groq TTS ──▶ MP3/WAV audio back to client
```

- **STT — Groq Whisper Large v3.** Chosen for speed and *automatic language detection* —
  we never hardcode a language param, because the product is bilingual (EN/TR) by design.
- **LLM — Claude Haiku (`claude-haiku-4-5-20251001`).** Fast + cheap enough to run on
  every utterance, smart enough for companion-quality replies. The system prompt is fed
  the user profile and the last 20 messages from KV.
- **TTS** — pluggable; the provider choice gets refined in later sessions (Sessions 03,
  05, 06). At foundation it just needed to return audio.

### Conversation memory
- Cloudflare **KV namespace `CONVERSATIONS`** stores the last 20 messages per `user_id`.
  KV (not a database) because the access pattern is trivial key/value and KV is free-tier
  generous and globally replicated.

## Purpose / what it serves

This session produces the single endpoint the rest of the product orbits. The pendant
will eventually stream audio to it; the app already does. By building the brain first, we
de-risked the hardest integration (real AI latency + multilingual handling) before
spending effort on UI.

## State at end of session

- Monorepo committed, backend pipeline written and deployable.
- Documentation seeded: `ARCHITECTURE.md`, `BUG_LOG.md`, `IDEAS.md`.
- No app UI yet, no hardware yet — intentional.
