# Auris Pendant — ESP32S3 Communication Protocol

## Hardware

- **MCU:** Seeed XIAO ESP32S3 (or XIAO ESP32S3 Sense)
- **Microphone:** INMP441 (I2S) or built-in PDM mic on Sense variant
- **Wireless:** BLE 5.0 + WiFi 802.11 b/g/n (dual-mode)

---

## Communication Modes

### 1. BLE (Primary — short range, low power)

Standard BLE GATT profile. The pendant acts as a **peripheral**; the iOS app acts as a **central**.

- iOS scans for the Auris Service UUID and connects on discovery.
- Audio is streamed as BLE NOTIFY characteristic updates (100 ms chunks).
- Control commands are written to the Control characteristic.

### 2. WiFi (Secondary — extended range)

Used when BLE range is insufficient or for bulk data transfer.

- Pendant connects to local network (or iOS Personal Hotspot).
- Audio chunks are sent as raw HTTP POST to `/v1/process-audio-raw` on the backend.
- No base64 encoding — raw binary body to minimize CPU load and bandwidth.

---

## Audio Pipeline

| Parameter     | Value                          |
|---------------|--------------------------------|
| Sample rate   | 16 000 Hz                      |
| Channels      | Mono                           |
| Bit depth     | 16-bit signed PCM              |
| Chunk size    | 100 ms → 1 600 samples → 3 200 bytes |
| Transport     | Raw binary (no base64)         |

**BLE path:** firmware captures I2S → fills 3 200-byte buffer → sends as NOTIFY on Audio characteristic → iOS `processBLEAudioBuffer()` reassembles → forwards to backend.

**WiFi path:** firmware captures I2S → fills 3 200-byte buffer → HTTP POST binary body to `/v1/process-audio-raw` with `X-User-Id` header.

---

## BLE GATT Service

### Service UUIDs (placeholder — update once firmware is confirmed)

| Role                   | UUID                                   |
|------------------------|----------------------------------------|
| Auris Service          | `12345678-1234-1234-1234-123456789abc` |
| Audio Characteristic   | `12345678-1234-1234-1234-123456789abd` |
| Control Characteristic | `12345678-1234-1234-1234-123456789abe` |

### Audio Characteristic (`...abd`)

- Properties: **NOTIFY**
- Value: raw 3 200-byte PCM chunk (100 ms of 16 kHz mono 16-bit audio)
- Sequence byte: first 2 bytes are a big-endian uint16 sequence number; remaining 3 198 bytes are audio data (adjust framing in firmware as needed)

### Control Characteristic (`...abe`)

- Properties: **WRITE** (no response)
- Value: single byte command

| Byte   | Command         | Description                            |
|--------|-----------------|----------------------------------------|
| `0x01` | START_STREAM    | Begin capturing and sending audio      |
| `0x02` | STOP_STREAM     | Stop capture, flush buffer             |
| `0x03` | STATUS_PING     | Pendant responds with battery + uptime |

---

## Authentication

- Each pendant has a unique device UUID burned into firmware at flash time.
- This UUID is sent as `X-User-Id` in WiFi requests and as the BLE device name / advertisement data.
- No runtime pairing secrets — identity is the UUID. Rotate by re-flashing.

---

## Power Management

| State            | Trigger                                | Current draw (est.) |
|------------------|----------------------------------------|---------------------|
| Deep sleep       | No BLE connection for 30 s            | ~10 µA              |
| BLE advertising  | Wake from button or timer             | ~0.5 mA             |
| BLE connected    | Idle (no audio stream)                | ~5 mA               |
| Streaming (BLE)  | After `0x01` command                  | ~30 mA              |
| Streaming (WiFi) | HTTP POST active                       | ~80 mA              |

Wake sources:
1. Button press (GPIO interrupt)
2. BLE connection event (modem keeps advertising in light sleep)

---

## iOS Integration Points

| iOS Layer           | File                              | Action                                      |
|---------------------|-----------------------------------|---------------------------------------------|
| BLE connection      | `app/services/BLEService.ts`      | `connect()`, `startAudioStream()`           |
| Audio buffer        | `app/services/BLEService.ts`      | `processBLEAudioBuffer(buffer)`             |
| Backend forwarding  | `app/services/AudioService.ts`    | POST to `/v1/process-audio-raw`             |
| UI state            | `app/app/(tabs)/index.tsx`        | Show BLE indicator when connected           |

---

## Implementation Notes

- **react-native-ble-plx** is the planned iOS BLE library. Install when hardware arrives:
  ```
  npx expo install react-native-ble-plx
  ```
  Add to `app.json` plugins: `["react-native-ble-plx", { "isBackgroundEnabled": false }]`
  Rebuild: `npx expo run:ios --port 8082`

- Firmware toolchain: **PlatformIO** with `espressif32` platform, `arduino` framework.
- I2S mic driver: use ESP-IDF `i2s_channel_read()` or Arduino `I2S.read()`.
- BLE library: Arduino `BLEDevice` / `NimBLE-Arduino` (lower RAM footprint).
