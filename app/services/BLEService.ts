// BLE bridge for XIAO ESP32S3 pendant (hardware arrives June 2-8).
// Library: react-native-ble-plx — install with Expo config plugin when hardware is ready:
//   npx expo install react-native-ble-plx
//   Add plugin to app.json: ["react-native-ble-plx", { "isBackgroundEnabled": false }]
//   Then rebuild: npx expo run:ios --port 8082

export type BLEConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

export type BLEAudioChunk = {
  sequenceNumber: number;
  data: Uint8Array;
};

// Characteristic UUIDs — to be finalized once firmware is written.
// These match the PlatformIO sketch convention; update when firmware is confirmed.
const AURIS_SERVICE_UUID = '12345678-1234-1234-1234-1234567890AB';
const AUDIO_CHAR_UUID = '12345678-1234-1234-1234-1234567890AC';

class BLEService {
  private connectionState: BLEConnectionState = 'disconnected';
  private chunkBuffer: Uint8Array[] = [];
  private onChunkCallback: ((chunk: BLEAudioChunk) => void) | null = null;
  private onStateChangeCallback: ((state: BLEConnectionState) => void) | null = null;

  getConnectionState(): BLEConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  onStateChange(cb: (state: BLEConnectionState) => void): void {
    this.onStateChangeCallback = cb;
  }

  onAudioChunk(cb: (chunk: BLEAudioChunk) => void): void {
    this.onChunkCallback = cb;
  }

  private setState(next: BLEConnectionState): void {
    this.connectionState = next;
    this.onStateChangeCallback?.(next);
  }

  // Scan for the Auris pendant and resolve with its device ID.
  async startScan(timeoutMs = 10_000): Promise<string> {
    // TODO: Use BleManager.startDeviceScan() from react-native-ble-plx.
    // Filter by AURIS_SERVICE_UUID. Resolve on first matching device.
    this.setState('scanning');
    throw new Error('BLE not implemented — hardware arrives June 2-8');
  }

  // Connect to the pendant by device ID returned from startScan().
  async connect(deviceId: string): Promise<void> {
    // TODO: BleManager.connectToDevice(deviceId) → discoverAllServicesAndCharacteristics().
    this.setState('connecting');
    throw new Error('BLE not implemented — hardware arrives June 2-8');
  }

  // Disconnect gracefully.
  async disconnect(): Promise<void> {
    // TODO: device.cancelConnection()
    this.chunkBuffer = [];
    this.setState('disconnected');
  }

  // Subscribe to the audio characteristic and start buffering chunks.
  async startAudioStream(): Promise<void> {
    if (!this.isConnected()) throw new Error('BLE not connected');
    // TODO: device.monitorCharacteristicForService(AURIS_SERVICE_UUID, AUDIO_CHAR_UUID, ...)
    // Parse incoming base64 characteristic value → Uint8Array → push to chunkBuffer.
    throw new Error('BLE audio stream not implemented — hardware arrives June 2-8');
  }

  // Unsubscribe from the audio characteristic.
  async stopAudioStream(): Promise<void> {
    // TODO: Remove the characteristic subscription created in startAudioStream().
    this.chunkBuffer = [];
  }

  // Concatenate all buffered chunks into a single contiguous audio buffer and clear the buffer.
  flushBuffer(): Uint8Array {
    const total = this.chunkBuffer.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of this.chunkBuffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.chunkBuffer = [];
    return merged;
  }
}

export const bleService = new BLEService();
