# Auris Voice & Social Mode — Technical Architecture

## 1. Voice Pipeline (Solo Mode)

### How a single conversation turn works

```
User taps orb
    │
    ▼
AudioService.startRecording()
    ├─ setAudioModeAsync({ allowsRecording: true, interruptionMode: 'doNotMix' })
    ├─ AudioModule.AudioRecorder(LINEARPCM 16kHz mono)
    └─ VAD listener: RECORDING_STATUS_UPDATE → metering dB
            │
            ├─ if dB < -45 for 1.5s AND recording elapsed > 2s → auto-stop
            └─ user taps orb again → manual stop
                    │
                    ▼
            audioService.stopRecording() → WAV file URI
                    │
                    ▼
            FileSystem.readAsStringAsync(uri, base64) → audio_base64
                    │
                    ▼
            POST /v1/process-audio-json
            body: { audio_base64, user_id, personality?, image_base64? }
            header: X-Auris-Key
                    │
                    ▼
            ┌─────────────────────────────────────┐
            │  Cloudflare Worker (Hono)           │
            │                                     │
            │  Groq Whisper large-v3-turbo        │
            │    → transcript + language          │
            │                                     │
            │  Claude Haiku                       │
            │    system: personality + user info  │
            │    context: KV last 20 messages     │
            │    → reply + todos[] + events[]     │
            │                                     │
            │  Groq Orpheus TTS (diana voice)     │
            │    input: reply text                │
            │    → WAV audio stream               │
            │                                     │
            │  Response headers:                  │
            │    X-Transcript, X-Reply,           │
            │    X-Todos, X-Events                │
            │  Response body: WAV audio bytes     │
            └─────────────────────────────────────┘
                    │
                    ▼
            BackendService saves WAV to temp file
                    │
            ┌───────┴────────────────┐
            │                        │
            ▼                        ▼
    addStreamingMessage(reply)   audioService.playFromUri(audioUri)
    (typewriter 60ms/word)       (concurrent — not awaited)
            │
            ▼
    setOrbState('idle')   ← after typewriter completes (~2s)
    (audio continues in background)
```

### Audio format rationale

| Format | Why chosen |
|--------|-----------|
| Linear PCM 16kHz mono WAV | Most reliable for Groq STT on iOS simulator |
| MPEG4-AAC (.m4a) | ❌ Produces malformed containers on simulator |
| base64 JSON body | ❌ FormData + File upload unreliable on Cloudflare Workers edge |

### Voice Activity Detection (VAD)

VAD is implemented in JavaScript via the `RECORDING_STATUS_UPDATE` event from expo-audio:

- **Threshold**: −45 dB (silence below this)
- **Silence duration**: 1500 ms continuous silence → triggers auto-stop
- **Minimum record guard**: 2000 ms must pass before VAD auto-stop is allowed (prevents empty files if CoreAudio session needs time to stabilise)
- **Manual override**: orb tap at any time forces stop

---

## 2. Social Mode (Ambient Intelligence)

### State machine

```
[idle / solo]
    │
    user swipes orb right → social, or taps SOLO/SOCIAL chip
    │
    ▼
SocialModeService.start()
    │
    ├─ sessionTimer = setTimeout(endSession, 10 min)
    │
    └─ startCycle()
            │
            ▼
        AudioService.startRecording(onVadStop = stopAndSend)
            │
            VAD fires (or silence detected)
            │
            ▼
        stopAndSend()
            ├─ stopRecording() → WAV URI
            ├─ POST /v1/process-audio-stream-json (fast path, no TTS)
            ├─ push transcript to sessionTranscripts[]
            ├─ if reply non-empty → insightCallback({ transcript, reply, todos, events })
            └─ startCycle()  ← immediately loops
```

### Insight delivery

When `insightCallback` fires in `index.tsx`:
1. `addMessage('auris', reply)` — appears inline in chat bubble
2. `notificationService.scheduleLocal(...)` — push notification (phone locked or app backgrounded)
3. `appendTodos(todos)` — saved to AsyncStorage
4. `appendEvents(events)` — saved to AsyncStorage

### Session end & summary

Triggered by:
- **10-minute timer** fires → `endSession()`
- **User taps "SOCIAL ACTIVE · TAP TO END & SUMMARIZE"** → `stopWithSummary()` → `endSession()`

`endSession()` workflow:
1. Joins all `sessionTranscripts[]` into one context string
2. Calls `POST /v1/summarize` with context + personality
3. Fires `sessionEndCallback({ summary, durationMinutes, transcriptCount })`
4. Sends push notification: "Auris — Session Complete"
5. Typewriter displays summary in chat

---

## 3. Vision Mode (Multimodal)

```
Camera button → CameraView.takePictureAsync({ base64: true, quality: 0.4 })
    │
    ▼
capturedImageBase64 stored in state
FloatingCanvas chip: "VISION ANALYSIS" → "ANALYZE"
    │
user taps ANALYZE chip → startRecording(stopAndProcess)
    │
user speaks question → VAD → stopAndProcess()
    │
    ├─ audioUri + imageBase64 → POST /v1/process-audio-json
    ├─ VAD guard: if transcript ≤ 3 words AND reply < 60 chars → "Speak a question"
    └─ VisionAnalysis bottom sheet opens (42% height)
         chip label → "SCAN RESULT"
         tap chip again → panel re-opens
```

---

## 4. Key Infrastructure

### Cloudflare Workers

- **Runtime**: Cloudflare Workers (V8 isolates, edge, ~0ms cold start)
- **Framework**: Hono (typed routing, middleware)
- **KV storage**: CONVERSATIONS namespace — last 20 messages per user_id
- **Node.js compat**: `nodejs_compat` flag required for `Buffer.from(base64)` decode
- **URL**: `https://auris-backend.aurisapi.workers.dev`

### Auth

- `X-Auris-Key` header on all `/v1/*` routes
- Key stored in Cloudflare secret `AURIS_API_KEY`
- App reads `EXPO_PUBLIC_AURIS_API_KEY` from `.env` (gitignored)

### Device identity

```
app launch
    │
    ├─ DeviceCodeService.load() from AsyncStorage
    ├─ if "003" (admin) → bypass network check
    ├─ if "AUR-XXXXXX" format → POST /v1/validate-code
    └─ if no code → redirect to /activate screen
```

### Storage (local, no cloud DB)

| Data | Storage |
|------|---------|
| Conversation KV | Cloudflare KV (server-side) |
| Todos, events | AsyncStorage (`@auris:todos`, `@auris:events`) |
| User profile | AsyncStorage (`@auris:name`, `@auris:profession`, etc.) |
| Profile photo | `expo-file-system` documentDirectory + URI in AsyncStorage |
| History | AsyncStorage (`@auris:history`) |
| Offline queue | AsyncStorage (`@auris:offline_queue`) |

AsyncStorage is **device-local, persistent** across app restarts. Cleared on app uninstall. No Supabase or remote database is used for the mobile app.

---

## 5. TTS Note (Current Limitation)

Groq Orpheus (`canopylabs/orpheus-v1-english`) produces high-quality English TTS but attempts to phonetically render non-English text in English — resulting in slow, unnatural output for Turkish. Planned fix: detect language from Whisper's output and fall back to OpenAI TTS Nova for non-English replies.
