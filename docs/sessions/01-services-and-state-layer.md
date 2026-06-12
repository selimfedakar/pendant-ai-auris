# Session 01 — Services & State Layer

**Date:** May 29, 2026
**Theme:** Build the app's "nervous system" — the service singletons that own audio,
network, persistence and the ambient loop — before any pixels are drawn.

---

## Goal

With the cloud brain live (Session 00), the app needs a clean service layer so the UI can
stay dumb. The rule we adopted: **screens render state; services own behavior.** This
session writes every service the app will lean on.

## What was built

Each service is a singleton in `app/services/`. Built in dependency order:

### `ProfileService.ts` / `HistoryService.ts`
- AsyncStorage-backed persistence for the user profile and conversation history.
- Purpose: give the LLM a stable identity to personalize against, and give the user a
  scrollable record of past conversations.

### `AudioService.ts` — recording + Voice Activity Detection (VAD)
- Built on **`expo-audio`** (Expo SDK 56), *not* the deprecated `expo-av`.
- VAD: auto-stops recording after **1.5 s** of silence below **−45 dB**; exposes metering
  so the UI can draw a live waveform.
- **Critical lesson (logged):** `expo-audio` renamed fields from `expo-av`
  (`allowsRecording` not `allowsRecordingIOS`, `playsInSilentMode` not the `...IOS`
  variant). TypeScript does *not* catch this because `AudioMode` is `Partial<>` — unknown
  keys are silently dropped, surfacing as a `RecordingDisabledException` at runtime. This
  cost real debugging time and is now a standing rule in the project memory.

### `BackendService.ts` — the API client
- Reads recorded audio as base64 (`FileSystem.readAsStringAsync`) and sends **JSON**, not
  multipart FormData.
- **Why base64-JSON and never FormData file upload:** React Native's FormData file part
  throws `Unsupported FormDataPart` intermittently and is unreliable across the edge
  runtime. Standardizing on base64-JSON eliminated a whole class of upload failures.

### `OfflineQueue.ts`
- Queues failed API requests to AsyncStorage (`@auris:offline_queue`); max 10 items, 24 h
  TTL; flushed on reconnect.
- Purpose: a wearable companion must not silently lose what you said when the network
  blips. Failed utterances retry automatically.

### `CalendarService.ts` / `NotificationService.ts`
- Calendar: reads upcoming iOS events to feed the LLM as context.
- Notifications: local notifications for Social Mode insights.
- **Rule baked in:** `Notifications.setNotificationHandler` must live inside a `setup()`
  method, never at module top level — module-level setup runs before permissions exist
  and silently no-ops.

### `SocialModeService.ts` — the ambient loop
- A background recording loop that periodically captures ambient audio, sends it through
  the pipeline, and fires an `onInsight` callback (→ silent phone notification).
- Purpose: this *is* "Social Mode" — the silent ambient-intelligence half of the product.

### `BLEService.ts` — skeleton
- Stubbed this session (real implementation lands in Session 06 when hardware arrives).
  Built early so the app's data flow already has a "pendant audio in" seam.

### Constants
- `constants/` — dark theme color palette and the AI personality modes (the selectable
  "characters" the companion can adopt).

## Purpose / what it serves

This layer is the contract between UI and the outside world. Because behavior is
centralized here, later sessions could redesign screens freely without touching audio,
network, or persistence logic.

## Errors & fixes

- **`RecordingDisabledException` at runtime** — root cause: `expo-av` field names used on
  `expo-audio`'s `Partial<>` AudioMode. Fix: use the `expo-audio` names; verify against
  `expo-audio/build/Audio.types.d.ts`, not `expo-av` docs.

## State at end of session

- Full service layer in place and committed (one file per commit, project rule).
- No screens yet — services are headless and ready to be wired up next session.
