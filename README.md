# Auris

<p align="center">
  <img src="docs/auris-pendant.png" width="520" alt="Auris pendant" />
</p>

<p align="center"><i>Auris is a software company. It happens to make jewelry.</i></p>

---

An always-on AI pendant. Wears around your neck. Listens, sees, thinks.

---

## What it is

Auris is a wearable pendant with a microphone, camera, and speaker. It runs two modes:

**Solo Mode** — you talk, it responds. Voice-in, voice-out. Full conversation memory, calendar awareness, vision analysis.

**Social Mode** — silent. It listens to your environment in the background and sends you a notification when something is worth your attention.

The pendant is a dumb sensor. All intelligence lives in the iOS app and the cloud.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        PENDANT                          │
│              mic  ·  camera  ·  speaker                 │
│                   ESP32S3 (BLE)                         │
└───────────────────────┬─────────────────────────────────┘
                        │ BLE audio stream
┌───────────────────────▼─────────────────────────────────┐
│                      iOS APP                            │
│  routing · memory · integrations · UI                   │
│                                                         │
│  AudioService    VAD · recording · playback             │
│  BackendService  API client · offline queue             │
│  CalendarService iOS calendar context                   │
│  SocialMode      ambient loop · notifications           │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS (base64 JSON)
┌───────────────────────▼─────────────────────────────────┐
│               CLOUDFLARE WORKERS                        │
│                                                         │
│  Groq Whisper large-v3-turbo    speech → text           │
│  Claude Haiku                   text → reply + todos    │
│  OpenAI TTS Nova                text → speech           │
│  Cloudflare KV                  conversation memory     │
└─────────────────────────────────────────────────────────┘
```

---

## Features

- **Voice conversation** with persistent memory (last 20 turns per user)
- **Vision analysis** — capture a photo mid-conversation, get multimodal response
- **Ambient intelligence** — background listening in social mode, silent notifications
- **Auto todo detection** — AI extracts tasks from speech, adds to todo list
- **Event detection** — mentions of meetings with times and people are captured automatically
- **Calendar context** — reads your next 7 days before each conversation
- **Offline queue** — failed requests stored locally, retried on reconnect
- **Streaming TTS** — reply text appears word-by-word while audio plays simultaneously

---

## Stack

| Layer | Technology |
|-------|-----------|
| App | Expo SDK 56 · React Native 0.85 · TypeScript |
| STT | Groq Whisper large-v3-turbo |
| LLM | Claude Haiku (claude-haiku-4-5) |
| TTS | OpenAI TTS Nova |
| Backend | Cloudflare Workers · Hono |
| Storage | Cloudflare KV · AsyncStorage |
| Hardware | XIAO ESP32S3 · PlatformIO |

---

## Repo structure

```
auris/
├── app/          Expo iOS app
│   ├── app/      screens (tabs: home, history, todos)
│   ├── components/
│   └── services/ AudioService · BackendService · CalendarService · ...
├── backend/      Cloudflare Workers (Hono)
│   └── src/index.ts
├── docs/
│   ├── ARCHITECTURE.md
│   └── BUG_LOG.md
└── firmware/     ESP32S3 (PlatformIO) — in progress
```

---

## Running locally

**Backend**
```bash
cd backend
npm install
npx wrangler dev
```

**App**
```bash
cd app
npm install
npx expo start --port 8082
```

You'll need a `.env` in `app/`:
```
EXPO_PUBLIC_AURIS_API_KEY=your_key
```

And Cloudflare secrets:
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GROQ_API_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put AURIS_API_KEY
```

---

## Hardware

The ESP32S3 firmware (PlatformIO) streams BLE audio to the iOS app. Hardware components arriving June 2026 — firmware branch in progress.

Current development uses the iOS simulator mic directly.

---

## Status

| Component | Status |
|-----------|--------|
| iOS app | complete |
| Backend (deployed) | complete |
| Voice pipeline | complete |
| Vision analysis | complete |
| Todo / event detection | complete |
| Calendar integration | complete |
| ESP32S3 firmware | in progress |
| Gmail integration | planned |
| EAS distribution build | ready |

---

---

## Team

**Ahmet Selim Fedakar** · Software & Engineering · Los Angeles  
**Mete Selçuk Şimşek** · Business & Marketing · Boston  
**Atilla Alkan** · AI Research · Harvard
