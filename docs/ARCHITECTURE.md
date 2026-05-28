# Auris — System Architecture

---

## 1. High-Level (3-Layer)

```
┌─────────────────────────────────────────────────────────────────┐
│                        HARDWARE LAYER                           │
│                                                                 │
│   [ XIAO ESP32S3 Pendant ]                                      │
│     • Mic     →  raw PCM audio chunks                           │
│     • Camera  →  JPEG frames                                    │
│     • Speaker    (future: TTS audio out)                        │
│     • BLE 5.0 radio                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │  BLE (audio chunks, image frames)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      iOS APP LAYER                              │
│                   React Native / Expo SDK 56                    │
│                                                                 │
│   BLEService  →  AudioService  →  BackendService               │
│                                                                 │
│   • Routing logic (which AI mode?)                              │
│   • Memory (conversation history, user profile, todos)          │
│   • UI (orb, waveform, vision panel, social mode)               │
│   • Offline queue (network failure resilience)                  │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTPS / JSON
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUD AI LAYER                               │
│              Cloudflare Workers (edge, global)                  │
│                                                                 │
│   Groq Whisper  →  Anthropic Claude  →  OpenAI TTS             │
│                                                                 │
│   • STT → LLM → TTS pipeline                                    │
│   • Conversation memory (Cloudflare KV)                         │
│   • Multi-modal (audio + vision)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. AI Pipeline — Data Flow & I/O

```
INPUT                    MODEL                   OUTPUT
─────────────────────────────────────────────────────────────────

[ audio_base64 ]
[ image_base64 ]  ──▶  [ Groq ]                 [ transcript: string ]
[ user_id      ]        whisper-large-v3-turbo   [ detected language  ]
                        auto language detection
                        ~300ms latency

                              │
                              ▼

[ transcript       ]
[ conversation     ]  ──▶  [ Anthropic ]         [ reply: string      ]
  history (KV)             claude-haiku-4-5       [ todos: string[]    ]
[ user profile     ]       context window: 200k
  name, profession,        system prompt:
  personality mode         personality + profile
[ image_base64?    ]       vision: yes (if image)

                              │
                              ▼

[ reply: string ]  ────▶  [ OpenAI ]             [ audio/mpeg (MP3)   ]
                           tts-1                  [ ~1-3s latency      ]
                           voice: nova
                           speed: 1.0

─────────────────────────────────────────────────────────────────
TOTAL PIPELINE LATENCY: ~2-5 seconds (edge → Groq → Claude → OpenAI)
```

---

## 3. iOS App — Internal Data Flow

```
                        ┌──────────────┐
                        │  AurisOrb UI │
                        │  tap = start │
                        │  recording   │
                        └──────┬───────┘
                               │
                               ▼
                     ┌─────────────────┐
                     │  AudioService   │
                     │                 │
                     │  VAD engine:    │
                     │  -45 dB thresh  │
                     │  1.5s silence   │──▶ auto-stop trigger
                     │                 │
                     │  metering   ────│──▶ WaveformBars UI
                     └──────┬──────────┘
                            │ .m4a URI
                            ▼
                  ┌──────────────────────┐
                  │   BackendService     │
                  │                      │
                  │  readFile → base64   │
                  │                      │
                  │  audio only?    ─────│──▶ /process-audio-stream-json
                  │  audio + image? ─────│──▶ /process-audio-json
                  │                      │
                  │  network fail?  ─────│──▶ OfflineQueue (AsyncStorage)
                  └──────┬───────────────┘
                         │ response
                         ▼
          ┌──────────────────────────────────┐
          │         Response Handler         │
          │                                  │
          │  X-Transcript ──▶ chat bubble    │
          │  X-Reply      ──▶ typewriter     │
          │  X-Todos      ──▶ TodoService    │
          │  MP3 body     ──▶ AudioService   │
          │                   .playFromUri() │
          └──────────────────────────────────┘
```

---

## 4. Two Operating Modes

```
┌───────────────────────────────┐   ┌───────────────────────────────┐
│         SOLO MODE             │   │        SOCIAL MODE            │
│                               │   │                               │
│  User-initiated               │   │  Always-on background         │
│                               │   │                               │
│  Tap orb → record →           │   │  SocialModeService loops:     │
│  VAD auto-stop →              │   │  record 30s →                 │
│  send to backend →            │   │  send to backend →            │
│  typewriter reply +           │   │  onInsight fires →            │
│  TTS audio plays              │   │  silent notification          │
│                               │   │  (no audio, no orb)           │
│  Full pipeline                │   │                               │
│  2-5s response                │   │  User stays in conversation,  │
│                               │   │  Auris observes silently      │
└───────────────────────────────┘   └───────────────────────────────┘
```

---

## 5. Model Selection Rationale

| Component | Model | Why |
|---|---|---|
| STT | Groq `whisper-large-v3-turbo` | Fastest Whisper variant, auto-detects language, ~300ms |
| LLM | Anthropic `claude-haiku-4-5` | Fastest Claude, 200k context, vision capable, low cost |
| TTS | OpenAI `tts-1` / voice: nova | Natural, low latency, MP3 output |
| Edge runtime | Cloudflare Workers | Global PoP, no cold starts, KV built-in |

---

## 6. Resilience & Memory

```
[ Conversation Memory ]
  Cloudflare KV  →  last 20 messages per user_id
  key: "conv:{user_id}"

[ User Profile Memory ]
  iOS AsyncStorage  →  name, profession, personality
  injected into Claude system prompt on every request

[ Offline Resilience ]
  network fail  →  OfflineQueue (AsyncStorage)
                   max 10 items, 24h TTL
  app foreground  →  AppState listener
                  →  flushOfflineQueue()
                  →  retries all queued requests silently
```

---

## 7. Upcoming — Hardware Integration (June 2-8)

```
[ XIAO ESP32S3 ]
     │
     │  BLE 5.0
     │  raw PCM chunks → sequenced packets
     ▼
[ BLEService.ts ]  (skeleton ready)
     │
     │  flushBuffer() → Uint8Array
     ▼
[ AudioService.processBLEAudioBuffer() ]  (stub ready)
     │
     │  write to temp file → URI
     ▼
[ BackendService.processMultiModal() ]  (unchanged — already accepts URI)
```

Firmware: PlatformIO + Arduino on ESP32S3.
iOS BLE library: `react-native-ble-plx` (install when hardware arrives, native rebuild required).

---

## 8. Tech Stack Summary

| Layer | Technology |
|---|---|
| Hardware | XIAO ESP32S3, BLE 5.0, MEMS mic, camera module |
| iOS App | React Native 0.85.3, Expo SDK 56, expo-router |
| Audio | expo-audio (VAD, metering, playback) |
| Animation | react-native-reanimated 4.3.1 |
| Backend runtime | Cloudflare Workers (edge, TypeScript) |
| Backend framework | Hono |
| Backend storage | Cloudflare KV |
| STT | Groq — whisper-large-v3-turbo |
| LLM | Anthropic — claude-haiku-4-5 |
| TTS | OpenAI — tts-1, voice: nova |
| Local storage | AsyncStorage (profile, history, todos, offline queue) |
