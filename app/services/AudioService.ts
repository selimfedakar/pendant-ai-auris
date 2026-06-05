import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  IOSOutputFormat,
  AudioQuality,
  createAudioPlayer,
} from 'expo-audio';
import AudioModule from 'expo-audio/build/AudioModule';
// These event keys are not re-exported by expo-audio's main index — import directly.
import { RECORDING_STATUS_UPDATE, PLAYBACK_STATUS_UPDATE } from 'expo-audio/build/AudioEventKeys';

const VAD_SILENCE_DB = -45;
const VAD_SILENCE_MS = 1500;
// Minimum recording duration before VAD auto-stop is allowed.
// Prevents near-empty files when CoreAudio session needs time to stabilise.
const VAD_MIN_RECORD_MS = 2000;

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
  private recordingStartTime = 0;

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

    // Release any stale CoreAudio session before acquiring a new one.
    // Without this, error 35 (EAGAIN) occurs when the previous session
    // hasn't fully torn down, producing a 0-byte recording.
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
    } catch { /* ignore */ }
    await new Promise(r => setTimeout(r, 200));

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
        const elapsed = Date.now() - this.recordingStartTime;
        if (!this.vadTimer && elapsed >= VAD_MIN_RECORD_MS) {
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

    // prepareToRecordAsync can fail on first launch if the audio session
    // hasn't settled yet (e.g. right after a permission grant). Retry once.
    try {
      await recorder.prepareToRecordAsync();
    } catch {
      await new Promise(r => setTimeout(r, 500));
      await recorder.prepareToRecordAsync();
    }
    recorder.record();
    this.recordingStartTime = Date.now();
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

    // Give iOS 100ms to fully commit the audio session category change
    // (allowsRecording: false releases the recording session so the speaker
    // route is restored; without the delay the audio can still come out of
    // the earpiece on the first play after a recording session).
    await new Promise(r => setTimeout(r, 100));

    const player = createAudioPlayer({ uri });
    this.player = player;

    await new Promise<void>((resolve) => {
      // 60s safety timeout — if didJustFinish never fires (empty/corrupt file), resolve anyway.
      const timeout = setTimeout(() => {
        sub.remove();
        resolve();
      }, 60000);

      const sub = player.addListener(PLAYBACK_STATUS_UPDATE, (status: any) => {
        if (status.didJustFinish) {
          clearTimeout(timeout);
          sub.remove();
          resolve();
        }
      });
      player.play();
    });

    try { player.remove(); } catch { /* ignore */ }
    this.player = null;
  }

  async stopPlayback(): Promise<void> {
    if (this.player) {
      try { this.player.pause(); } catch { /* ignore */ }
      try { (this.player as any).remove?.(); } catch { /* ignore */ }
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
