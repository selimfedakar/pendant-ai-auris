# Session 07 — App Store Readiness, Security Hardening & On-Device Voice

**Dates:** June 10–11, 2026 (internally "Session 5")
**Theme:** Close the gap to submission — security hardening, a merged onboarding + access
gate, a bulletproof on-device voice fallback, and a clean prebuild — then take the rate
limiter live.

---

## Goal

The product works. This session is about everything between "works on my machine" and
"survives App Store review + hostile users": fail-closed auth, rate limiting, privacy
manifests, a polished first-launch flow, and finally killing the long-standing "Auris
doesn't speak" bug for good.

## What was built

### Security hardening (backend)
- **Fail-closed auth** — `/v1/*` rejects when the key is missing *or* wrong:
  `if (!expectedKey || provided !== expectedKey) → 401`. Previously a misconfigured/empty
  key could fail *open*; now the default is "deny." Verified live after deploy: requests
  without `X-Auris-Key` return **401**. (Commit `90bb05b`.)
- **Prompt-injection limits** on user-supplied context fields + a `DELETE
  /v1/conversations/:userId` endpoint (right-to-delete, GDPR/App Store hygiene).
- **Rate limiting** — `/v1/validate-code` capped at **5 attempts per IP per 10 min** to
  stop brute-forcing of `AUR-XXXXXX` customer codes. (Commit `4a99f0b`.) **This is the
  change that went live this session** (deploy version `99746512`).
- **Gmail OAuth token → iOS Keychain** via `expo-secure-store` (was AsyncStorage, which is
  not encrypted at rest). (Commit `9d6987b`.)

### Onboarding + access gate, merged (UX)
- `onboarding.tsx` rewritten as a **4-page horizontal pager**: 3 info slides + a 4th page
  that *is* the access-code gate (admin `003` offline bypass; customer `AUR-XXXXXX` →
  `POST /v1/validate-code`). On success it stores the code + onboarding flag and routes to
  `/(tabs)`. (Commits `e43b6b7`, `c47abfd`.)
- `_layout.tsx` routing simplified: no stored code → `/onboarding` (gate lives inside);
  code present → `/(tabs)`. The separate `/activate` redirect was removed. (Commit
  `6cf253a`.)
- **Why merge them:** two separate first-run screens (intro + activate) was redundant
  friction. One flow that informs *then* gates is cleaner and matches how the hardware is
  actually unboxed.

### On-device voice fallback — "Auris konuşmuyor" FIXED (for real this time)
- The long tail: cloud TTS can still skip (`X-TTS-Skipped`) under rate limits, leaving an
  empty `audioUri` → silent reply. Earlier sessions fixed this *server-side* (non-fatal
  TTS in S03, Nova fallback in S05). This session adds the **last-resort client fix**:
- `expo-speech` added; `AudioService.speakText(text)` stops cloud playback, sets the
  speaker audio mode, auto-selects `tr-TR`/`en-US` by content, with a 20 s safety timeout.
  `stopPlayback()` also calls `Speech.stop()`.
- `index.tsx`: when `audioUri` is empty, call `speakText(reply)` concurrently with the
  typewriter. **Auris now always speaks** — cloud TTS preferred when present, on-device
  synthesis when not. (Commits `147d217`, `5bb9e62`.)
- **Why this is the right final fix:** it removes the cloud as a single point of failure
  for voice. No provider outage can make Auris go silent again.

### App Store / build hygiene
- iOS privacy manifests, Info.plist config, dark splash variant. (Commit `ce8c1c4`.)
- EAS production build profile. (Commit `cb2a5f7`.)
- `useFocusEffect` reload of history on focus (Commit `101ec2d`); `__DEV__`-guarded debug
  logs so production builds stay quiet (Commit `fbf4537`); contextual side node recolored
  crimson → **violet** for the final palette (Commit `4e1efe0`).
- **`prebuild --clean` ran** (`CI=1 npx expo prebuild --clean -p ios --non-interactive`):
  regenerated native projects, fixed `$(PRODUCT_NAME)` placeholders, regenerated the
  privacy manifest, and pruned 10 stale agent worktrees. Build #2 succeeded with
  `expo-speech`; verified on iPhone 17 simulator (iOS 26.5) — onboarding 4-dot flow +
  violet node confirmed.

### Audit
- The user's 17-item App Store readiness list was checked **against the code, not memory**.
  Most items were already done (BLE perms, fail-closed auth, Gmail SecureStore, BLE chip,
  onboarding, data deletion); the rest (rate limit, splash, privacy, violet node,
  focus-reload, log guards, EAS production) were closed this session. Remaining items are
  manual values only (see below).

## Errors & fixes

| Symptom | Root cause | Fix |
|---|---|---|
| "Auris doesn't speak" persists despite server fixes | empty `audioUri` when cloud TTS skipped | on-device `expo-speech` fallback — always speaks |
| Auth could fail *open* | no guard when expected key empty | fail-closed: deny unless key present **and** matches |
| `AUR-XXXXXX` codes brute-forceable | no throttling on validate-code | 5 attempts / IP / 10 min rate limit |
| `$(PRODUCT_NAME)` placeholders + stale manifest | drifted native project | `prebuild --clean` regenerate |

## Purpose / what it serves

This is the "ready to submit + ready for strangers" session. After it, the backend is
hardened and rate-limited, the first-run experience is a single coherent gated flow, and
the product's core promise — *it talks back* — can no longer be broken by a cloud hiccup.

## State at end of session

- **All code committed** (12 atomic commits, one file each) and **pushed**.
- **Backend deployed** — version `99746512`, rate limiting live, fail-closed auth verified
  (401 without key).
- Build #2 verified on simulator.

### Still pending (carried forward)
- **Physical BLE end-to-end test** — blocked on: (1) XIAO not detected on USB
  (`/dev/cu.usbmodem101` absent — re-check with `ls /dev/cu.* | grep -vi bluetooth`),
  (2) Xcode signing Team not set after the clean prebuild (set AurisAI target → Signing →
  Team: Selim Fedakar), then `npx expo run:ios --device --port 8082`.
- **Manual values:** `eas.json` `ascAppId` (App Store Connect → App Info → Apple ID) +
  `appleTeamId` (developer.apple.com → Membership); host the Privacy Policy web page and
  update `app.json` + `profile.tsx`; rotate `EXPO_PUBLIC_AURIS_API_KEY`.
- **Customer code seeding** in KV for real `AUR-XXXXXX` codes.
