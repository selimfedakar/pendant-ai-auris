import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

export type BLEConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

export type BLEAudioChunk = {
  sequenceNumber: number;
  data: Uint8Array;
};

// UUIDs from firmware (main.cpp)
const AURIS_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const AUDIO_CHAR_UUID    = '12345678-1234-1234-1234-123456789abd';
const CTRL_CHAR_UUID     = '12345678-1234-1234-1234-123456789abe';

// Firmware sends 240 bytes of PCM per notify; 3200 bytes = 100 ms at 16 kHz 16-bit mono
const FLUSH_THRESHOLD_BYTES = 3200;

class BLEService {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private audioSub: Subscription | null = null;
  private connectionState: BLEConnectionState = 'disconnected';

  private pcmChunks: Uint8Array[] = [];
  private pcmBytes = 0;

  private onChunkCallback: ((chunk: BLEAudioChunk) => void) | null = null;
  private onFlushCallback: ((pcm: Uint8Array) => void) | null = null;
  private onStateChangeCallback: ((state: BLEConnectionState) => void) | null = null;

  private getManager(): BleManager {
    if (!this.manager) this.manager = new BleManager();
    return this.manager;
  }

  getConnectionState(): BLEConnectionState { return this.connectionState; }
  isConnected(): boolean { return this.connectionState === 'connected'; }

  onStateChange(cb: (state: BLEConnectionState) => void): void { this.onStateChangeCallback = cb; }
  onAudioChunk(cb: (chunk: BLEAudioChunk) => void): void { this.onChunkCallback = cb; }
  // Called every ~100 ms with a 3200-byte raw PCM buffer (16 kHz, 16-bit, mono LE)
  onAudioFlush(cb: (pcm: Uint8Array) => void): void { this.onFlushCallback = cb; }

  private setState(next: BLEConnectionState): void {
    this.connectionState = next;
    this.onStateChangeCallback?.(next);
  }

  async scanAndConnect(timeoutMs = 10_000): Promise<void> {
    const mgr = this.getManager();
    this.setState('scanning');

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        mgr.stopDeviceScan();
        this.setState('disconnected');
        reject(new Error('BLE scan timeout — AurisPendant not found'));
      }, timeoutMs);

      mgr.startDeviceScan(
        [AURIS_SERVICE_UUID],
        { allowDuplicates: false },
        async (error, device) => {
          if (error) {
            clearTimeout(timer);
            this.setState('disconnected');
            reject(error);
            return;
          }
          if (!device) return;

          mgr.stopDeviceScan();
          clearTimeout(timer);
          this.setState('connecting');

          try {
            const connected = await device.connect({ requestMTU: 512 });
            await connected.discoverAllServicesAndCharacteristics();
            this.device = connected;
            this.setState('connected');

            connected.onDisconnected((_err, _dev) => {
              this.device = null;
              this.audioSub = null;
              this.setState('disconnected');
            });

            resolve();
          } catch (err) {
            this.setState('disconnected');
            reject(err);
          }
        },
      );
    });
  }

  async startStream(): Promise<void> {
    if (!this.device || !this.isConnected()) throw new Error('BLE not connected');

    const startCmd = Buffer.from([0x01]).toString('base64');
    await this.device.writeCharacteristicWithoutResponseForService(
      AURIS_SERVICE_UUID, CTRL_CHAR_UUID, startCmd,
    );

    this.pcmChunks = [];
    this.pcmBytes = 0;

    this.audioSub = this.device.monitorCharacteristicForService(
      AURIS_SERVICE_UUID,
      AUDIO_CHAR_UUID,
      (error, char) => {
        if (error || !char?.value) return;

        const raw = Buffer.from(char.value, 'base64');
        if (raw.length < 3) return;

        const seqNum = (raw[0]! << 8) | raw[1]!;
        const audio = new Uint8Array(raw.buffer, raw.byteOffset + 2, raw.length - 2);

        this.onChunkCallback?.({ sequenceNumber: seqNum, data: audio });

        this.pcmChunks.push(audio);
        this.pcmBytes += audio.length;

        if (this.pcmBytes >= FLUSH_THRESHOLD_BYTES) {
          this.onFlushCallback?.(this.flushBuffer());
        }
      },
    );
  }

  async stopStream(): Promise<void> {
    this.audioSub?.remove();
    this.audioSub = null;

    if (this.device && this.isConnected()) {
      try {
        const stopCmd = Buffer.from([0x02]).toString('base64');
        await this.device.writeCharacteristicWithoutResponseForService(
          AURIS_SERVICE_UUID, CTRL_CHAR_UUID, stopCmd,
        );
      } catch { /* best effort */ }
    }

    if (this.pcmBytes > 0) this.onFlushCallback?.(this.flushBuffer());
  }

  async disconnect(): Promise<void> {
    await this.stopStream().catch(() => {});
    if (this.device) {
      try { await this.device.cancelConnection(); } catch { /* ignore */ }
      this.device = null;
    }
    this.setState('disconnected');
  }

  flushBuffer(): Uint8Array {
    const merged = new Uint8Array(this.pcmBytes);
    let offset = 0;
    for (const chunk of this.pcmChunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.pcmChunks = [];
    this.pcmBytes = 0;
    return merged;
  }
}

export const bleService = new BLEService();
