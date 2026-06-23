# 12 — Pendant Hands-Free Trigger (board mic + on-board button)

**Date:** Jun 22
**Theme:** Make the pendant a real input device — talk through the board's own
microphone, triggered both from the phone and from a button on the pendant itself.

## Why this session exists

Until now the BLE link only *connected* the pendant; the orb still recorded from the
**phone** microphone. That defeats the product's whole premise: if the board's mic is
never used, the hardware is pointless. The goal of Auris is a necklace you tap and speak
into while the phone stays in your pocket. This session wires that end to end for audio.

## What was built

### 1. Firmware — board → phone events (on-board button)

The control flow used to be one-directional (phone writes `START_STREAM` / `STOP_STREAM`
to the board). The board could not tell the phone "the user pressed me." We added the
reverse channel:

- New GATT characteristic **EVENT** (`...abf`, `NOTIFY`) on the existing Auris service.
- `poll_button()` in `loop()` reads the on-board **BOOT button (GPIO0, active-low)**,
  debounced (250 ms) with clean falling-edge detection. On a press it sends a one-byte
  notify `0x10` (`EV_BUTTON_PRESS`) — but only while a central is connected.
- No extra hardware: the XIAO's on-board BOOT button is the prototype trigger. When the
  board becomes a real pendant, this maps to the necklace's physical button.

**How it serves the architecture:** the board stays a dumb sensor — it only reports
"pressed" and streams raw PCM. All decision-making (start a turn, run STT→LLM→TTS) stays
in the app (the brain). The phone can be in a pocket; the pendant drives the turn.

### 2. App — pendant audio path (`BLEService.ts`)

- New `EVENT_CHAR_UUID` + `onButtonPress(cb)`. On connect we subscribe to the EVENT
  characteristic; a `0x10` payload fires the callback. The subscription is kept alive
  across streams (so each button press can start the next turn) and torn down on
  disconnect.
- Existing `startStream` / `onAudioFlush` / `stopStream` (3200-byte PCM flushes) are now
  actually consumed by the UI.

### 3. App — press-to-talk wiring (`app/(tabs)/index.tsx`)

- `pendantPcmRef` accumulates every 100 ms PCM flush; `pendantStreamingRef` tracks the
  press-to-talk state.
- `handlePendantTrigger()` — 1st trigger starts the board stream and shows the orb
  "listening"; 2nd trigger stops it and processes. Identical UX to the on-screen orb.
- `processPendantAudio()` merges the streamed PCM and calls the raw-PCM backend path
  `backendService.processPCM()` (`/v1/process-audio-pcm`). That endpoint returns no
  audio, so the reply is spoken with on-device TTS (`audioService.speakText`). Results
  (transcript, reply, todos, events) feed the same history / todo / calendar handlers as
  the phone path.
- Both triggers route here:
  - **Phone:** when the pendant is connected, the on-screen orb drives the board mic for
    plain conversation (Email/Calendar still use the phone path because they inject
    calendar/inbox context, which the PCM endpoint does not carry).
  - **Pendant:** the BLE button event calls the same handler through a ref (registered
    once on mount, always pointing at the latest closure).

## Note on the "ExpoSpeech not found" launch crash

This was **not** a code bug. `expo-speech` (added in Session 7 / report 07) is a native
module; the dev build installed on the test phone predates it, so loading new JS over the
old binary throws `Cannot find native module 'ExpoSpeech'`. The fix is a native rebuild
(`npx expo run:ios --device`), which also compiles in the new BLE event code. After one
device rebuild the QR/tunnel workflow works again.

## Not in scope yet (next)

- **Board camera.** The XIAO ESP32S3 Sense has a camera, but the firmware has no camera
  capture/transfer code, and images are too heavy for this BLE NOTIFY path — that will use
  the WiFi route. Vision still uses the phone camera for now.
- Physical end-to-end verification on a real iPhone (BLE cannot run on the simulator).

## Files changed

- `firmware/platformio.ini` — upload port for the re-enumerated XIAO (`usbmodem1101`).
- `firmware/src/main.cpp` — EVENT characteristic + button polling/notify.
- `app/services/BLEService.ts` — EVENT subscription + `onButtonPress`.
- `app/app/(tabs)/index.tsx` — pendant press-to-talk path + orb/button routing.
