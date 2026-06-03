# Auris — Bug Log

Chronological log of bugs encountered, root causes, and fixes applied.

---

## [2026-05-25] expo-av incompatible with Expo SDK 56

**Symptom**
```
❌ 'ExpoModulesCore/EXEventEmitter.h' file not found
```
Native iOS build (`npx expo run:ios`) fails at compile time. The `EXAV.h` header in `expo-av` imports `EXEventEmitter.h` from `ExpoModulesCore`, which was removed in SDK 56.

**Root cause**
`expo-av@16.0.8` (the version resolved by `npx expo install expo-av --fix`) was not actually compatible with Expo SDK 56's `ExpoModulesCore`. The `EXEventEmitter` protocol was extracted and removed from `ExpoModulesCore` in the SDK 56 cycle.

**Fix**
Migrated fully from `expo-av` to the SDK 56 native packages:
- Recording: `expo-audio` (`AudioRecorder` class + `prepareToRecordAsync` / `record` / `stop`)
- Playback: `expo-audio` (`createAudioPlayer` + `player.play()`)
- Rewrite: `services/AudioService.ts` rewritten to use `expo-audio` APIs

```bash
npm uninstall expo-av --legacy-peer-deps
npx expo install expo-audio -- --legacy-peer-deps
```

---

## [2026-05-25] app.json retained expo-av config plugin after package removal

**Symptom**
```
PluginError: Failed to resolve plugin for module "expo-av"
relative to "/Users/.../auris/app"
```
`npx expo prebuild` fails immediately even after `expo-av` was uninstalled.

**Root cause**
`app.json` `plugins` array still contained `"expo-av"`. Config plugins are resolved at prebuild time; a missing package referenced here is a hard error.

**Fix**
Removed `"expo-av"` from the `plugins` array in `app.json`.

```json
// Before
"plugins": ["expo-router", "expo-av", "expo-camera", ...]

// After
"plugins": ["expo-router", "expo-camera", ...]
```

---

## [2026-05-25] react-native-worklets missing — Reanimated 4.x peer dependency

**Symptom**
```
Unable to resolve module react-native-worklets from
.../react-native-reanimated/src/initializers.ts:
react-native-worklets could not be found
```
Metro bundler error at runtime (dev server). Also:
```
[Reanimated] Failed to validate worklets version.
```
Pod install failure during native build.

**Root cause**
`react-native-reanimated@4.3.1` (Expo SDK 56 version) extracted the worklets runtime into a separate package `react-native-worklets`. This package is a required peer dependency but was not automatically installed by `npx expo install`.

The podspec for Reanimated validates that `react-native-worklets` is installed at exactly `0.8.x`. Version `0.8.3` (latest at the time) did not pass validation — only `0.8.1` was accepted.

**Fix**
```bash
npm install react-native-worklets@0.8.1 --legacy-peer-deps
```

---

## [2026-05-25] npx expo run:ios --clean — unknown argument

**Symptom**
```
CommandError: Unknown arguments: --clean
```

**Root cause**
`--clean` is not a valid flag for `expo run:ios` in Expo SDK 56. The flag was removed or never existed in this CLI version.

**Fix**
Use `expo run:ios` without `--clean`. To force a clean native build, run `expo prebuild --clean` first, then `expo run:ios`.

```bash
npx expo prebuild --clean
npx expo run:ios
```

---

## [2026-05-25] npm ERESOLVE conflict during expo-audio install

**Symptom**
```
npm error ERESOLVE could not resolve
npm error While resolving: react-dom@19.2.6
npm error Found: react@19.2.3
```
`npx expo install expo-audio` fails due to a peer dependency version conflict between `react` and `react-dom`.

**Root cause**
The project uses `react@19.2.3` but another package resolves `react-dom@19.2.6` which requires `react@19.2.6`. npm's strict peer dependency resolution (default in npm 7+) blocks the install.

**Fix**
Pass `--legacy-peer-deps` through to npm:
```bash
npx expo install expo-audio -- --legacy-peer-deps
```

---

## [2026-05-25] AudioService VAD — metering requires isMeteringEnabled flag

**Symptom**
`status.metering` always `undefined` even with `setOnRecordingStatusUpdate` / status listener active.

**Root cause**
`expo-audio`'s `AudioRecorder` does not emit metering data unless the recording options explicitly include `isMeteringEnabled: true`. The default `RecordingPresets.HIGH_QUALITY` does not set this flag.

**Fix**
Spread the preset and override the flag:
```ts
const recorder = new AudioModule.AudioRecorder({
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
});
```

---

---

## [2026-05-25] PlatformConstants not found — wrong Metro server

**Symptom**
```
[runtime not ready]: Invariant Violation: TurboModuleRegistry.getEnforcing(...):
'PlatformConstants' could not be found.
```
App crashes immediately on launch in the simulator.

**Root cause**
GymStride's Metro server was already running on port 8081. When `npx expo run:ios` started in non-interactive mode it could not prompt "Use port 8082 instead?" — it skipped starting a dev server entirely. The installed Auris binary then connected to GymStride's Metro server on 8081 and received the wrong JS bundle. `PlatformConstants` and other TurboModules could not be found because the bundle was mismatched with the native binary.

**Fix**
Start the Auris Metro server explicitly on a separate port:
```bash
cd /Users/selimfedakar/auris/app
npx expo start --port 8082
```
Then in the simulator press Cmd+D → Reload (or close/reopen the app).
GymStride uses 8081, Auris uses 8082 — always start both servers separately.

---

## [2026-05-25] Turkish strings in personalities.ts

**Symptom**
`constants/personalities.ts` contained `nameTR` and `descriptionTR` fields with Turkish text. Project policy requires all source files to be in English (GitHub-public, international product).

**Fix**
Removed `nameTR` and `descriptionTR` fields from `PersonalityMode` type and all `PERSONALITIES` entries. English `name` and `description` fields remain. Localization can be added later via a proper i18n system if needed.

---

## [2026-05-25] Easing.sine undefined in Reanimated 4.x

**Symptom**
```
TypeError: undefined is not a function
    at reactNativeReanimated_EasingTs21 (.../Easing.ts:251:21)
```
AurisOrb crashes immediately on mount. The error originates from the worklet thread.

**Root cause**
`Easing.sine` does not exist in `react-native-reanimated@4.3.1`. The sinusoidal easing function was renamed to `Easing.sin` in Reanimated 4.x. Calling `Easing.inOut(undefined)` throws inside the worklet.

**Fix**
Replace all `Easing.sine` references with `Easing.sin` in `components/AurisOrb.tsx`.

---

## [2026-05-25] FileReader.result null for large binary blobs in React Native

**Symptom**
```
value is undefined, expected a string
```
Audio playback silently fails or crashes after receiving a large MP3 response from the backend.

**Root cause**
`FileReader.readAsDataURL()` can return `null` for `result` on large binary payloads in React Native. Calling `null.split(',')[1]` produces `undefined`, which then propagates into `FileSystem.writeAsStringAsync` and throws.

**Fix**
Replaced `FileReader`-based `blobToBase64` with `arrayBufferToBase64` in `services/BackendService.ts`:
```ts
const bytes = new Uint8Array(await blob.arrayBuffer());
// chunk-loop btoa — no FileReader involved
```

---

## [2026-05-25] RecordingDisabledException — wrong AudioMode field names from expo-av migration

**Symptom**
```
RecordingDisabledException: Recording not allowed on iOS. Enable with Audio.setAudioModeAsync
```
Thrown on `recorder.record()` even though `setAudioModeAsync` is called before it.

**Root cause**
`setAudioModeAsync` was called with expo-av field names: `allowsRecordingIOS` / `playsInSilentModeIOS`.
expo-audio SDK 56 renamed these to `allowsRecording` / `playsInSilentMode`.
iOS silently ignores unknown keys → audio session never enabled for recording → `record()` throws.

**Fix**
In `services/AudioService.ts`, replaced all three `setAudioModeAsync` calls:
```ts
// Before (expo-av):
{ allowsRecordingIOS: true, playsInSilentModeIOS: true }
// After (expo-audio SDK 56):
{ allowsRecording: true, playsInSilentMode: true }
```

---

## [2026-05-25] Orb press does nothing — RECORDING_STATUS_UPDATE undefined

**Symptom**
Tapping the orb shows no response: state stays 'idle', no animation change, no error banner visible.

**Root cause**
`RECORDING_STATUS_UPDATE` is defined in `expo-audio/build/AudioEventKeys` but is NOT re-exported by `expo-audio`'s main `build/index.js` (which only re-exports `ExpoAudio`, `AudioConstants`, `RecordingConstants`).

Importing `{ RECORDING_STATUS_UPDATE } from 'expo-audio'` silently resolves to `undefined`.

Then `recorder.addListener(undefined, callback)` throws: `"Event name must be a string, received: undefined"`. This error is caught in `handleOrbPress`'s catch block and sent to `setError()`, but the small error banner is easy to miss. The orb never transitions to `'listening'`.

**Fix**
Changed import in `services/AudioService.ts` to the direct module path:
```ts
import { RECORDING_STATUS_UPDATE } from 'expo-audio/build/AudioEventKeys';
```

Also removed the nonexistent `status.uri` fallback in `stopRecording` — `RecorderState` only has `url`, not `uri`.

---

## [2026-05-25] "No script URL provided" — jsBundleURL returns nil on fresh install

**Symptom**
```
No script URL provided. Make sure the packager is running or you have embedded a JS bundle.
unsanitizedScriptURLString = (null)
```
App crashes on launch after a fresh install or simulator reset, even with Metro running.

**Root cause**
`RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot:)` returns nil when `jsLocation` (UserDefault key `RCT_jsLocation`) is nil. On a fresh install or after simulator reset, this UserDefault is unset. Expo's `expo run:ios --port XXXX` is supposed to set it on first launch via a launch argument, but this did not work reliably in the Expo SDK 56 / RN 0.85 native build setup.

**Fix**
In `ios/AurisAI/AppDelegate.swift`, added a one-time fallback:
```swift
if provider.jsLocation == nil || provider.jsLocation!.isEmpty {
    provider.jsLocation = "localhost"
}
```
Only sets the host (never the port) so it does not hardcode a port. Port is still read from UserDefaults or defaults to RN's built-in 8081 until the user runs `expo run:ios --port XXXX` once. After that first run, jsLocation in UserDefaults is updated and the fallback is skipped.

---

## [2026-05-25] "Value is undefined, expected a String" — multiple undefined paths

**Symptom**
React Native RedBox overlay: `Value is undefined, expected a String` during or after audio processing.

**Root cause (multi-path)**
1. `decodeURIComponent(header)` throws `URIError` on malformed percent-encoding → `result.reply` never assigned → Text component receives `undefined`
2. `result.todos` could be non-array on network edge cases → `appendTodos(undefined)` → `.length` throw inside callback
3. `err?.message` on non-Error thrown values (e.g. network abort) → message is undefined → template literal `(Error: undefined)` → Text receives literal string "undefined" not a crash, but wrong
4. Animated shared value `.value` accessed before worklet initialization → `rotation.value ?? 0` guard missing

**Fix**
- `BackendService.ts`: replaced all `decodeURIComponent(header ?? '')` with `safeDecodeHeader(header)` — try/catch returns raw string on URIError
- `index.tsx`: `String(result.reply ?? '')`, `String(result.transcript ?? '')`, `Array.isArray(result.todos) ? result.todos : []`, `String(err?.message ?? ...)`
- `AurisOrb.tsx`: `rotation.value ?? 0` in rotate worklet, `STATE_LABELS[state] ?? ''` in Text
- `WaveformBars.tsx`: `height.value ?? MIN_HEIGHT` in animated style

---

## [2026-05-25] Creating blobs from ArrayBuffer not supported — saveBlobToFile crash

**Symptom**
```
Creating blobs from 'ArrayBuffer' and 'ArrayBuffer' are not supported
```
App crashes after successful backend response — audio never plays.

**Root cause**
`saveBlobToFile(blob)` called `blob.arrayBuffer()`. On Hermes with `newArchEnabled: false`, creating a Blob from an ArrayBuffer is explicitly not supported. The two-step chain `response.blob()` → `blob.arrayBuffer()` hits this restriction.

**Fix**
Eliminated the intermediate Blob entirely. Replaced with direct `response.arrayBuffer()` call and renamed helper to `saveArrayBufferToFile`. The ArrayBuffer is converted to base64 inline — same `arrayBufferToBase64` function, no Blob involved.

---

## [2026-05-25] RecordingDisabledException on rapid re-tap — stale recorder not cleaned up

**Symptom**
On rapid successive orb taps (or after a failed recording), next `startRecording()` throws `RecordingDisabledException` even though audio mode is set correctly.

**Root cause**
If `this.recorder` was non-null from a previous session (e.g., aborted flow), `startRecording` would create a second recorder without stopping the first. iOS native audio session could not be acquired for a second simultaneous recorder instance.

**Fix**
Added recorder cleanup at the top of `startRecording()` in `AudioService.ts`: stops and nullifies any existing `this.recorder` and clears the VAD subscription before creating a new one.

---

## [2026-05-27] Groq 400 "could not process file" — Workers base64 decode + File constructor

**Symptom**
```
Groq STT failed (400): could not process file - is it a valid media file?
```
Every transcription request fails. Error persisted across sessions even after the audio/m4a → audio/mp4 MIME type fix.

**Root cause (two compounding issues)**

1. **`atob` + char-by-char loop corrupts binary data in Cloudflare Workers.**
   The `base64ToBlob` implementation used:
   ```typescript
   const binaryStr = atob(clean);
   const bytes = new Uint8Array(binaryStr.length);
   for (let i = 0; i < binaryStr.length; i++) {
     bytes[i] = binaryStr.charCodeAt(i);
   }
   ```
   In Cloudflare Workers' V8 runtime, this loop is extremely slow for large payloads (30s audio = ~640K iterations). The Workers CPU time budget (10ms free / 30ms paid) can be exceeded mid-loop, producing a **truncated Uint8Array**. Groq receives a file whose M4A `ftyp` header is intact but whose audio frames are truncated — hence "could not process file" rather than a clear format error.

2. **`new File([blob], name, {type})` is unreliable in edge runtimes.**
   Cloudflare Workers' implementation of the `File` constructor does not always set the multipart `Content-Disposition: filename` header correctly when serialized via `FormData`. Without the filename, Groq falls back to pure MIME-type sniffing of `audio/mp4`, which is ambiguous (could be video, AAC audio, etc.) and fails on some payloads.

**Fix**
1. Replaced `atob` + loop with `Buffer.from(base64, "base64")` — available via `nodejs_compat` flag. This is a single native call: no loop, no truncation risk, handles padding/whitespace correctly.
2. Replaced `new File([audioBlob], "audio.m4a", { type: "audio/mp4" })` + `formData.append("file", file)` with the 3-argument form: `formData.append("file", audioBlob, "audio.m4a")`. The explicit filename argument guarantees `Content-Disposition: attachment; filename="audio.m4a"` in the multipart part regardless of runtime.
3. Changed Groq model from `whisper-large-v3` to `whisper-large-v3-turbo` — lower latency and more lenient on edge-case audio inputs.
4. Added `audioBlob.size < 1000` guard: returns a clear "Audio too short" error instead of sending a tiny blob that Groq would reject silently.
5. Deployed: version `4e0b531a`.

---

## [2026-05-25] Groq 400 "could not process file" — audio/m4a MIME type rejected

**Symptom**
```
Groq STT failed: 400 — could not process file - is it a valid media file?
```
Backend transcription fails on every request even though the audio data is valid.

**Root cause**
`base64ToBlob(audioBase64, "audio/m4a")` created a `Blob` with MIME type `audio/m4a`. This MIME type is non-standard (not in RFC 4337). Groq's Whisper API validates the Content-Type of the multipart part and rejects `audio/m4a`. The correct RFC MIME type for M4A (MPEG-4 Audio) files is `audio/mp4`.

Additionally, passing a bare `Blob` to `formData.append("file", blob, "audio.m4a")` in Cloudflare Workers does not guarantee that the Content-Type is emitted in the multipart Content-Disposition. Using a `File` object is the spec-compliant approach.

**Fix**
1. Changed `base64ToBlob(audioBase64, "audio/m4a")` → `"audio/mp4"` in both JSON endpoints.
2. In `transcribeAudio`, replaced `formData.append("file", audioBlob, "audio.m4a")` with `new File([audioBlob], "audio.m4a", { type: "audio/mp4" })` → `formData.append("file", audioFile)`. This guarantees both filename and Content-Type are correctly set in the multipart body.
3. Added `base64.replace(/[\s\r\n]/g, "")` cleanup before `atob()` in `base64ToBlob` to guard against any line-break-padded base64 input.
4. Deployed to production: version `b5639cbd`.

---

---

## [2026-06-03] VisionAnalysis panel too short to display analysis text

**Symptom**
VisionAnalysis panel appeared empty; analysis text was not readable.

**Root cause**
`PANEL_HEIGHT` was set to `SCREEN_HEIGHT * 0.25` (~213pt on an 852pt screen). After the header row (65pt) and drag handle (25pt), only ~123pt remained for scroll content — too small to show meaningful analysis text.

**Fix**
Changed `PANEL_HEIGHT` from `SCREEN_HEIGHT * 0.25` to `SCREEN_HEIGHT * 0.42` in `VisionAnalysis.tsx`.

---

## [2026-06-03] CalendarConfirmationCard appeared after every vision analysis

**Symptom**
`CalendarConfirmationCard` appeared after every vision analysis (photo + audio pipeline), interrupting the analysis result view.

**Root cause**
`stopAndProcess` in `index.tsx` fired `setPendingCalendarAction` for ALL detected events regardless of whether the request was vision mode or audio-only mode. Vision analysis replies sometimes contained event-like phrasing that Claude detected, triggering the calendar card unintentionally.

**Fix**
Added an `!imageSnapshot` guard so the calendar card only fires for audio-only pipeline results.

---

## [2026-06-03] "PHOTO READY · TAP ANALYZE OR ORB" hint hidden behind thumbnail card

**Symptom**
"PHOTO READY · TAP ANALYZE OR ORB" hint text was hidden behind the thumbnail preview card.

**Root cause**
`thumbnailCard` was positioned at `bottom: 180, right: 20`. The hint row sits at approximately 220pt from the screen bottom. The thumbnail (72px tall, spanning from bottom 180 to 252) overlapped horizontally with the right portion of the centered hint text.

**Fix**
Moved `thumbnailCard` to `bottom: 264` and reduced its size to 60×60.

---

## [2026-06-03] "tap to talk" and "CAPTURE" label visually overlapping

**Symptom**
"tap to talk" hint and the "CAPTURE" camera button label appeared visually overlapping / cluttered in the lower screen area.

**Root cause**
`hintRow` shows "tap to talk" when idle with no photo. `cameraSection` rendered a "CAPTURE" label directly below the camera button. Both rendered in the same column within ~50pt of each other, creating visual noise.

**Fix**
Removed the "CAPTURE" label when no photo is attached (icon is self-explanatory). Only show the "RETAKE" label when a photo has already been captured.

---

## [2026-06-03] VAD ambient-noise trigger causes "You're welcome" vision analysis

**Symptom**
VAD fired after 1.5s of ambient silence during vision mode. Groq STT transcribed background noise as "thank you" (or a similar short phrase). Claude replied "You're welcome", and VisionAnalysis panel showed "You're welcome" as the image analysis result.

**Root cause**
AudioService VAD threshold (1.5s silence at −45 dB) fired on ambient noise with no real user speech. The recording was not rejected by the backend (>1000 bytes). Claude's reply was a social nicety rather than a real image analysis.

**Fix**
Added a guard in `stopAndProcess`: if vision mode (`imageSnapshot` set) AND transcript word count ≤ 3 AND reply length < 60 chars, restore `capturedImageBase64`, display the prompt "Speak a question about the image to start analysis." and return early without running the analysis flow.

---

## [2026-06-03] Pressing orb after vision analysis appeared to do nothing

**Symptom**
After a successful (or bad) vision analysis, pressing the orb appeared to do nothing from the user's perspective.

**Root cause**
`stopAndProcess` clears `capturedImageBase64` at the start. After vision analysis completed, `visionPanel.analysis` was set from the previous result and the CenterNode chip showed "SCAN RESULT". Taking a new photo set `capturedImageBase64` but did NOT clear `visionPanel.analysis`, so the chip remained "SCAN RESULT" and tapping it re-opened the old analysis panel instead of triggering a new recording. Pressing the orb then started an audio-only recording (no image context) because `capturedImageBase64` had already been cleared.

**Fix**
In `handleTakePicture`, after `setCapturedImageBase64(photo.base64)`, added:
```ts
setVisionPanel({ imageBase64: null, transcript: '', analysis: '', visible: false })
```
This resets analysis state whenever a new photo is captured.

---

*Updated automatically — add new entries at the top of each session.*
