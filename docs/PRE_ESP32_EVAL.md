# Auris — Pre-ESP32 Status Evaluation

> Date: May 29, 2026
> Scope: Software status, ESP32 integration estimate, vision/mission analysis, priority order

---

## Software Side: Solid

The codebase speaks for itself: backend deployed and working, iOS pipeline end-to-end verified, expo-audio migration complete, streaming typewriter running, offline queue in place, haptics done. For an MVP, this level is strong — **most startups run out of money before reaching this point.**

---

## When the ESP32 Arrives — Realistic Picture

**No, it won't be smooth. That's not good news, but let's be transparent:**

Right now `BLEService.ts` is a skeleton — every method inside throws `new Error('BLE not implemented')`. `AudioService.processBLEAudioBuffer` is a stub. The `firmware/` directory doesn't exist. `react-native-ble-plx` is not installed. So when the ESP32 arrives:

**What needs to be done (in order):**

### 1. Firmware written from scratch — PlatformIO / Arduino
- BLE service + characteristic definitions (UUIDs are placeholders right now)
- Mic → PCM → BLE stream (MTU chunking is critical: 16kHz mono 16-bit = 32KB/s, BLE 5.0 practical limit ~250Kbps → borderline, chunk size needs care)
- **Physical button characteristic** — button press → BLE notification → app
- GPIO debounce

### 2. `react-native-ble-plx` install + native rebuild
```bash
npx expo install react-native-ble-plx
# Add plugin to app.json: ["react-native-ble-plx", { "isBackgroundEnabled": false }]
npx expo run:ios --port 8082  # full rebuild required
```

### 3. Implement BLEService.ts
- `startScan`, `connect`, `startAudioStream`, button press subscription — all TODO

### 4. Implement `AudioService.processBLEAudioBuffer`
- PCM chunks → WAV file → URI → feeds into existing backend pipeline
- Stub is ready, body is empty

### 5. UI: connection status indicator
- Pendant connected/disconnected must be visible
- Currently missing entirely

### 6. UUID finalization
- UUIDs between firmware and app are `12345678-1234-1234-1234-1234567890AB/AC` (placeholders)
- Lock them in when writing firmware, keep both sides in sync

**Estimated time: 3–7 days** — hardware debugging included. ESP32 BLE + iOS together is notoriously friction-heavy.

---

## Physical Button → App Flow

Architecture is designed correctly, not implemented. The intended full flow:

```
[Pendant button]
    → ESP32 BLE notification (button press characteristic)
    → BLEService.ts listener → event dispatch to index.tsx
    → handleOrbPress() fires (existing code works unchanged)
    → VAD → STT → LLM → TTS
    → TTS response goes to pendant speaker?  ← not decided yet
```

**Critical open question: where does TTS audio go?**
Right now TTS plays from the iOS speaker. The pendant has a speaker but there is no architecture for routing audio to it. Two options:

- **Option A:** TTS audio keeps playing from iOS — user has to take out their phone, wearable feel is weak
- **Option B:** Backend MP3 → app → BLE → ESP32 speaker — real wearable experience, but adds latency and strains BLE bandwidth

Option B is correct but can come later. iOS speaker is sufficient for the first iteration; transition can happen after.

---

## Vision / Mission — Honest Assessment

**"Auris is a software company. It happens to make jewelry"** — this framing is perfect. Keep it.

### Strengths

- 3-layer architecture (dumb hardware / smart app / cloud AI) is correct
- Differentiator from Limitless: the camera — **this is a real moat, use it**
- IDEAS.md's "Ghost Mode + Pre-meeting Brief + Relationship Memory" trio — correctly identified as the core differentiator

### Weaknesses / Gaps

**1. Solo Mode is currently a fancy voice assistant**
It does the same thing without the pendant. Real value lives in Social Mode + the pendant. But Social Mode currently runs on 30-second loops, is not user-configurable, and delivers "something detected" notifications rather than real insight.

**2. Relationship Memory is not implemented**
IDEAS.md calls it a "core differentiator" but it doesn't exist in the codebase. KV only stores the last 20 messages per user_id. Name-based person memory, commitment tracking — these are the things that will separate Auris from Limitless. That gap is currently closed.

**3. Model choice**
`claude-haiku-4-5` is good, but for a $199 device + $14.99/mo product, users will feel response quality. Try `claude-sonnet-4-6` — latency difference is ~500ms but response quality is noticeably better. Subscription pricing can absorb the cost.

**4. No onboarding**
No name entry, no personality selection. User opens the app and sees the orb immediately. For an AI companion product this is a broken first-run experience.

**5. Calendar + Email modules are misaligned**
FloatingCanvas shows "Calendar Sync" and "Email Intel". Calendar works for real, Email is a placeholder. This inconsistency reads as unfinished to the user. Either implement it or hide it.

---

## Priority Order

### Before ESP32 arrives — Now

| # | Task | Time |
|---|------|------|
| 1 | First GitHub commit — still 0 commits | 30 min |
| 2 | EAS build — for Mete's real device | 1 hour |
| 3 | Onboarding screen — name + personality selection | 1–2 days |
| 4 | Email module: implement or remove from UI | Half day |

### When ESP32 arrives — Order matters

| # | Task | Note |
|---|------|------|
| 1 | Write firmware (PlatformIO) | Longest item |
| 2 | Finalize UUIDs | Firmware + app must stay in sync |
| 3 | react-native-ble-plx install + rebuild | Native rebuild required |
| 4 | Implement BLEService | scan → connect → stream |
| 5 | Button press → `handleOrbPress` wiring | Existing code largely unchanged |
| 6 | Implement `processBLEAudioBuffer` | PCM → WAV → URI |
| 7 | TTS → pendant speaker decision | Can defer to second iteration |

### Medium term — 1–2 months

1. **Relationship Memory** — person-based memory. This is the real differentiator; don't delay.
2. **Ghost Mode** — proper Social Mode implementation (not just "insight detected" — what was detected?)
3. **Switch to Claude Sonnet** — for response quality
4. **Persona evolution** — persona that learns from usage instead of 5 static cards
5. **TTS → pendant speaker** — the real wearable feel comes from here

---

## Summary

Software is solid. ESP32 integration will take longer than expected — firmware + BLE + iOS together is highly friction-heavy, 3–7 days of work. Vision is correct but the current product delivers roughly 1/4 of that vision. Without Relationship Memory and Ghost Mode there is no real answer to Limitless competition. Onboarding + EAS build + first git commit are urgent. Even without firmware, there is a working product that can be shown to Mete on a real device — try it.
