# Session 06 — Hardware Bridge: ESP32S3 Firmware + BLE Audio Pipeline

**Dates:** June 7–8, 2026
**Theme:** The pendant arrives. Write the firmware, implement the real BLE GATT client in
the app, and add the backend's raw-PCM ingress — closing the loop from physical mic to
cloud AI.

---

## Goal

Until now the "pendant" was a stub. The Seeed **XIAO ESP32S3 Sense** physically arrived
(June 7). This session makes the three-layer architecture real for the first time: a
physical mic streams audio over Bluetooth Low Energy to the iPhone, which forwards it to
the cloud brain.

## What was built

### Firmware (`firmware/`, PlatformIO + Arduino)
- `platformio.ini` — board config for the XIAO ESP32S3 Sense, `upload_port =
  /dev/cu.usbmodem101`.
- `src/main.cpp` — BLE audio streaming from the board's **built-in PDM microphone**:
  - GATT server advertising as `AurisPendant`, with a control characteristic
    (START/STOP_STREAM) and an audio NOTIFY characteristic.
  - Captures 16 kHz / 16-bit mono PCM and pushes it out in BLE notifications.
- **Why BLE (not Wi-Fi) as the primary path:** BLE is low-power — essential for a
  wearable that must last a day on a tiny battery. (A Wi-Fi direct path to
  `/v1/process-audio-pcm` exists as a fallback for higher throughput.)

### App-side BLE client (`services/BLEService.ts`) — full implementation
- Built on **`react-native-ble-plx`** (+ `buffer` polyfill for base64 decode).
- Scans for the pendant by service UUID, negotiates **MTU 512**, writes START/STOP_STREAM
  control commands, subscribes to the audio NOTIFY characteristic.
- Strips the 2-byte sequence header, accumulates a **3200-byte PCM buffer** (= 100 ms at
  16 kHz/16-bit mono), then fires `onAudioFlush` → the app sends it onward.
- These are **new native dependencies**, so a native rebuild was required.

### Backend raw-PCM ingress (`/v1/process-audio-pcm`)
- Accepts a raw 16 kHz mono 16-bit PCM body + `X-User-Id` header, **builds the WAV header
  inline**, and returns JSON `{transcript, reply, todos?, events?}`.
- `BackendService.processPCM()` added on the app side to call it.
- *Why a separate endpoint:* the pendant/app BLE path produces raw PCM frames; encoding a
  WAV header server-side keeps the device dumb (architecture rule #1).

### UX
- `todos.tsx`: replaced the `ActionSheetIOS` event editor with a proper `EventEditSheet`
  bottom sheet (title/date/time pickers/location/notes/participants). (Commit `046dfe4`.)

## Errors & fixes (firmware is where hardware reality bites)

1. **Board overheating / reset loop.**
   - *Symptom:* the ESP32S3 grew hot and kept rebooting.
   - *Root cause:* `mic_init` used `ESP_ERROR_CHECK`, which *aborts and resets* on any I2S
     error, creating a boot loop that pinned the CPU.
   - *Fix:* crash-safe init — `if (err != ESP_OK) { Serial.println(...); return; }`. The
     board now boots cleanly even if the mic init hiccups.

2. **I2S PDM header not in the framework.**
   - *Root cause:* `driver/i2s_pdm.h` isn't present in this Arduino framework version.
   - *Fix:* migrate to the legacy `driver/i2s.h` API.

3. **NimBLE v2.x API breakage.**
   - `getDataLength()` → `getValue().size()`, `setScanResponse()` removed,
     `getSubscribedCount()` → `pServer->getConnectedCount()`.

4. **iOS audio-session crash on simulator** (carried from voice work).
   - *Fix:* `playToken` abort guard, `setAudioModeAsync` retry after 300 ms,
     `createAudioPlayer`/`player.play()` wrapped in try/catch, playback timeout 60 s → 15 s.
     (Commit `651c611`.)

## Purpose / what it serves

This is the session that makes Auris *hardware* and not just an app. The full path —
PDM mic → BLE → iPhone → cloud → reply — exists in code. It is the technical proof of the
whole pendant thesis.

## State at end of session

- Firmware flashed to the XIAO ESP32S3; BLE advertising confirmed compiling.
- App BLE client fully implemented; backend PCM ingress live.
- **Still pending physical end-to-end test** — blocked on Xcode code-signing for an
  on-device build and on confirming the board's USB serial port (see Session 07).
