# Session 05 — Calendar Sync, Spatial Canvas & Social-Mode Hardening

**Dates:** June 2–6, 2026
**Theme:** Turn detected intentions into real calendar events, make the pendant-node canvas
a tactile spatial interface, and harden Social Mode + make the voice truly bilingual.

---

## Goal

Auris hears "let's meet Thursday at 3" — now it must *act* on it (write a calendar event,
with the user confirming), present a spatial UI that feels like manipulating the physical
pendant, and stop Social Mode from misbehaving (restart loops, never-appearing summaries),
all while speaking the user's actual language.

## What was built

### Calendar write path + confirmation card
- `CalendarService.syncWithCalendar()` — writes events to the iOS calendar.
- Backend `DetectedEvent` extended with optional `general_timeframe`, `location`,
  `description`; the LLM prompt was rewritten **to eliminate time hallucination** (it must
  not invent a precise time when the user was vague). (Commit `d3ff370`.)
- `CalendarConfirmationCard.tsx` — spring slide-up card with editable title/location, an
  ALL-DAY toggle, and a **pure-JS drum-roll time picker** (`DrumColumn` ScrollView,
  `snapToInterval`), no native picker dependency. The user always confirms before anything
  is written. (Commits `31f81c3`, `ed91b4c`.)
- **Why confirmation:** auto-writing AI-inferred events to someone's real calendar is a
  trust landmine. A one-tap confirm card keeps the human in the loop.

### Spatial canvas (`FloatingCanvas.tsx`)
- Reduced to a single draggable side node + a centered vision chip; `Gesture.Pan` drag,
  and a key UX decision: **no snap-back — the node stays where you drop it.** The canvas
  models the pendant as a physical object you arrange. (Commits `44cea0f`, `60fe1a0`,
  `e7dbea4`.)
- `AurisOrb` gained a **swipe mode-switcher**: swipe left → Social (blue), right → Solo
  (gold), with a ghost-orb transition. One gesture toggles the product's two modes.
  (Commit `a3f35fe`.)

### Social Mode hardening
- **Restart-loop bug** (the big one): the Social Mode `useEffect` depended on callbacks
  (`appendTodos`/`appendEvents`) whose references changed on every state update, so the
  ambient session restarted constantly. *Fix:* split into two effects — a mount-only
  callback registration (refs-based, never re-runs) and a `[mode]`-only start/stop.
  (Commit `95c60d0`.)
- **Summary never appearing:** the summary card was guarded by `transcriptCount > 0`; in a
  quiet room there were no transcripts, so it never showed. *Fix:* always show
  `SocialSummaryCard` on session end. (Commit `21899c6`.)
- **Double-fire on keyword end:** `endSession` now `clearTimeout`s the session timer
  instead of nulling it. (Commit `2d10b6f`.)
- New: keyword-triggered summary — saying "özet"/"summary"/"ne konuştuk" ends the session
  immediately. (Commit `7545204`.)
- `SocialSummaryCard.tsx` — blue-accented slide-up with duration/segment chips and the
  summary, 8 s auto-dismiss.

### Multilingual voice (the bilingual promise, delivered)
- Backend TTS routing by **detected language**: Whisper `verbose_json` language →
  **Orpheus** voice for English, **OpenAI Nova** for Turkish/other. (Commit `65b37ff`.)
- **Orpheus → Nova fallback** when Orpheus fails (its terms require org acceptance at
  Groq). So English degrades to Nova rather than going silent. (Commit `4fdd76c`.)

### Smaller hardening
- `AudioService`: release the stale CoreAudio session 200 ms before a new recording; VAD
  minimum 2 s guard (kills accidental sub-second recordings). (Commit `6c128bb`.)
- 2 KB frontend file-size check rejects near-empty audio before it ever hits the backend.
  (Commit `0fcc545`.)
- Todos: calendar-sync button + edit/reschedule on event and AI-todo rows.
- Profile: front-camera photo capture saved to the document directory.
- `docs/VOICE_SOCIAL_TECHNICAL.md` written — the architecture reference for this whole
  pipeline. (Commit `9999f50`.)

## Errors & fixes (summary)

| Symptom | Root cause | Fix |
|---|---|---|
| Ambient session restarts constantly | `useEffect` deps were unstable callback refs | Split into mount-only + `[mode]`-only effects |
| Summary card never shows | Guarded by `transcriptCount > 0` | Always show on session end |
| Summary fires twice | timer nulled, not cleared | `clearTimeout` in `endSession` |
| English TTS silent | Orpheus terms not accepted | Nova fallback on Orpheus error |
| LLM invents meeting times | prompt allowed precise time from vague input | rewrote prompt + `general_timeframe` field |
| Calendar card render race | `useState(true)` then `useEffect` correction | lazy-init state via initializer callback |

## Purpose / what it serves

This session makes Auris *actuate* (calendar), *feel physical* (canvas + orb swipe), run
ambient mode reliably, and speak whichever language you spoke — closing most of the gap
between "voice demo" and "daily-driver assistant."

## State at end of session

- Calendar confirm-and-write working; canvas + orb-swipe interaction shipped.
- Social Mode stable; bilingual TTS with graceful fallback.
- Architecture documented in `VOICE_SOCIAL_TECHNICAL.md`.
