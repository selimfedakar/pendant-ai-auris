import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  IOSOutputFormat,
  AudioQuality,
  createAudioPlayer,
} from 'expo-audio';
import AudioModule from 'expo-audio/build/AudioModule';
// RECORDING_STATUS_UPDATE is not re-exported by expo-audio's main index — import directly.
import { RECORDING_STATUS_UPDATE } from 'expo-audio/build/AudioEventKeys';

const VAD_SILENCE_DB = -45;
const VAD_SILENCE_MS = 1500;

// WAV (Linear PCM) is the most reliably supported format by Groq STT.
// MPEG4AAC (.m4a) can produce malformed containers on iOS simulator.
const RECORDING_OPTIONS = {
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 128000,
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  android: {
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
  isMeteringEnabled: true,
};

class AudioService {
  private recorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;
  private player: ReturnType<typeof createAudioPlayer> | null = null;
  private permissionGranted = false;
  private vadTimer: ReturnType<typeof setTimeout> | null = null;
  private onVadStop: (() => void) | null = null;
  private vadSubscription: { remove: () => void } | null = null;
  private meteringCallback: ((db: number) => void) | null = null;

  setMeteringCallback(cb: ((db: number) => void) | null): void {
    this.meteringCallback = cb;
  }

  async requestPermissions(): Promise<boolean> {
    const { granted } = await requestRecordingPermissionsAsync();
    this.permissionGranted = granted;
    return granted;
  }

  async startRecording(onVadStop?: () => void): Promise<void> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermissions();
      if (!granted) throw new Error('Microphone permission denied');
    }

    // Clean up any lingering recorder before starting fresh
    if (this.recorder) {
      try { await this.recorder.stop(); } catch { /* stale */ }
      this.vadSubscription?.remove();
      this.vadSubscription = null;
      this.recorder = null;
    }
    if (this.vadTimer) { clearTimeout(this.vadTimer); this.vadTimer = null; }

    this.onVadStop = onVadStop ?? null;

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
    });

    const recorder = new AudioModule.AudioRecorder(RECORDING_OPTIONS);

    this.vadSubscription = recorder.addListener(RECORDING_STATUS_UPDATE, (status: any) => {
      if (!status.isRecording) return;
      const db: number = status.metering ?? 0;
      this.meteringCallback?.(db);
      if (db < VAD_SILENCE_DB) {
        if (!this.vadTimer) {
          this.vadTimer = setTimeout(() => {
            this.vadTimer = null;
            this.onVadStop?.();
          }, VAD_SILENCE_MS);
        }
      } else {
        if (this.vadTimer) {
          clearTimeout(this.vadTimer);
          this.vadTimer = null;
        }
      }
    });

    await recorder.prepareToRecordAsync();
    recorder.record();
    this.recorder = recorder;
  }

  async stopRecording(): Promise<string> {
    if (!this.recorder) throw new Error('No active recording');

    if (this.vadTimer) { clearTimeout(this.vadTimer); this.vadTimer = null; }
    this.onVadStop = null;
    this.vadSubscription?.remove();
    this.vadSubscription = null;

    await this.recorder.stop();
    const uri = this.recorder.uri;
    this.recorder = null;

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });

    if (!uri) throw new Error('Recording URI is null');
    return uri;
  }

  async playFromUri(uri: string): Promise<void> {
    await this.stopPlayback();

    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });

    const player = createAudioPlayer({ uri });
    this.player = player;

    await new Promise<void>((resolve) => {
      const sub = player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          sub.remove();
          resolve();
        }
      });
      player.play();
    });

    player.release();
    this.player = null;
  }

  async stopPlayback(): Promise<void> {
    if (this.player) {
      try { this.player.pause(); } catch { /* ignore */ }
      try { this.player.release(); } catch { /* ignore */ }
      this.player = null;
    }
  }

  isRecording(): boolean {
    return this.recorder !== null;
  }

  // Entry point for BLE audio path (XIAO ESP32S3, hardware arrives June 2-8).
  // Call bleService.flushBuffer() to get rawPCM, then pass here.
  // This method saves raw PCM bytes to a temp file and returns its URI so BackendService
  // can send it as base64 — same pipeline as microphone recordings.
  async processBLEAudioBuffer(_rawPCM: Uint8Array): Promise<string> {
    // TODO: Write rawPCM to a temp .m4a (or .wav) file via expo-file-system,
    // then return the file URI. BackendService.processMultiModal() already accepts a URI.
    throw new Error('BLE audio processing not implemented — hardware arrives June 2-8');
  }
}

export const audioService = new AudioService();
