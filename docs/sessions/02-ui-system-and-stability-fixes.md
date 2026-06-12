# Session 02 — UI System, Screens & First Critical Stability Fixes

**Date:** May 30, 2026
**Theme:** Give the brain a face — the orb, the waveform, the floating-pendant canvas, the
tabbed screens — and immediately fix the first round of pipeline-breaking bugs.

---

## Goal

The service layer (Session 01) is headless. This session builds the visual identity of
Auris and wires the home screen to the full voice pipeline end-to-end, then fixes the bugs
that surfaced the moment real audio and real streaming hit the UI.

## What was built

### Signature components (`app/components/`)
- **`AurisOrb.tsx`** — the central animated orb, the product's face. State machine:
  `idle | listening | processing | analyzing | speaking`, each with its own color and
  animation (e.g. `analyzing` = cyan dual-ring scan for vision mode). Built on
  Reanimated 4.
- **`WaveformBars.tsx`** — 7 metering-driven bars with a bell-curve height profile, so the
  user *sees* their voice being heard while recording.
- **`VisionAnalysis.tsx`** — a swipe-to-dismiss bottom sheet that shows camera analysis
  results.
- **`FloatingCanvas.tsx`** — three floating "pendant node" chips above the tab bar; the
  spatial metaphor for the physical necklace inside the app.
- **`ContextualBottomSheet.tsx`** — the module selector (Visual / Calendar / Email).

### Screens (`app/app/`)
- `_layout.tsx` (root) + `(tabs)/_layout.tsx` (tab bar).
- `(tabs)/index.tsx` — **the home screen, wired to the full pipeline:** orb press →
  record → VAD auto-stop → STT → LLM → TTS → playback, with a streaming typewriter reply.
- `(tabs)/history.tsx`, `(tabs)/todos.tsx`, `(tabs)/profile.tsx`.
- Assets: app icon, splash icon, favicon, Android adaptive layers, pendant concept sketch.

### Native dev-client config plugin (the subtle but important one)
- `withDevClientBundleURL` Expo config plugin: rewrites the generated `AppDelegate`'s
  `bundleURL()` so debug builds on **real devices** load from the dev server (and release
  builds load the embedded bundle).
- **Why a plugin, not a manual edit:** `app/ios/` is regenerated on every `prebuild`, so a
  hand-edit would be wiped. The plugin re-applies the change every time.

## Errors & fixes (this is where it got real)

1. **Claude reply collapsing to a single character (`reply = "M"`).**
   - *Symptom:* streamed LLM replies were truncated to the first delta.
   - *Root cause:* `collectClaudeStream` split SSE chunks naively; a JSON event spanning a
     chunk boundary was dropped, capturing only the first `text` delta.
   - *Fix:* a `lineBuffer` that carries incomplete lines across chunk boundaries. Commit
     `19ac328`.

2. **Audio playback never firing / never releasing.**
   - *Symptom:* orb stuck in `speaking`; TTS audio silently skipped.
   - *Root cause:* used a string-literal event name instead of `PLAYBACK_STATUS_UPDATE`
     from `expo-audio/build/AudioEventKeys`, so the "finished" event never matched.
   - *Fix:* import the real event key, add a 60 s safety timeout, use `player.remove()`.
     Commit `b212381`.

3. **React peer-dep conflict (`react` vs `react-dom`).**
   - *Fix:* bump `react` to 19.2.6 and pin `react-dom` to 19.2.3 via `overrides`. Commits
     `7d20650`, `0650584`.

4. **Dev-client bundle URL nil on real devices** — Expo SDK 56's prebuild generates a new
   `ExpoReactNativeFactoryDelegate` AppDelegate format the first regex didn't match.
   - *Fix:* make the plugin format-agnostic (brace-counting to locate and replace the
     whole `bundleURL()` body). Commit `bf388fb`.

## Purpose / what it serves

After this session, Auris is a *working app*: you can talk to it and it talks back, with a
distinct visual language. The fixes here hardened the two riskiest seams — LLM streaming
and audio playback — which had been failing silently.

## State at end of session

- Full UI + working voice pipeline on simulator.
- Streaming and playback bugs resolved.
- Dev-client builds work on real devices (groundwork for partner testing).
