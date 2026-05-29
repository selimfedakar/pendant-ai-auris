import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { offlineQueue } from './OfflineQueue';

const BACKEND_URL_KEY = '@auris:backend_url';
const DEFAULT_BACKEND_URL = 'https://auris-backend.aurisapi.workers.dev';
const AURIS_API_KEY = process.env.EXPO_PUBLIC_AURIS_API_KEY ?? '';

export type DetectedEvent = { title: string; datetime: string; participants: string[] };

export type ProcessAudioResult = {
  transcript: string;
  reply: string;
  audioUri: string;
  todos: string[];
  events: DetectedEvent[];
};

class BackendService {
  private backendUrl: string = DEFAULT_BACKEND_URL;

  async loadConfig(): Promise<void> {
    const stored = await AsyncStorage.getItem(BACKEND_URL_KEY);
    if (stored) this.backendUrl = stored;
  }

  async saveBackendUrl(url: string): Promise<void> {
    this.backendUrl = url;
    await AsyncStorage.setItem(BACKEND_URL_KEY, url);
  }

  getBackendUrl(): string {
    return this.backendUrl;
  }

  private async readFileAsBase64(uri: string): Promise<string> {
    const fileUri = uri.startsWith('file://') ? uri : `file://${uri}`;
    return FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  private parseAudioResponse(response: Response): Pick<ProcessAudioResult, 'transcript' | 'todos' | 'events'> & { reply: string } {
    const transcript = safeDecodeHeader(response.headers.get('X-Transcript'));
    const reply = safeDecodeHeader(response.headers.get('X-Reply'));
    const todosRaw = response.headers.get('X-Todos');
    const eventsRaw = response.headers.get('X-Events');
    let todos: string[] = [];
    let events: DetectedEvent[] = [];
    if (todosRaw) {
      try { todos = JSON.parse(safeDecodeHeader(todosRaw)); } catch { /* ignore */ }
    }
    if (eventsRaw) {
      try { events = JSON.parse(safeDecodeHeader(eventsRaw)); } catch { /* ignore */ }
    }
    return { transcript, reply, todos, events };
  }

  async processAudio(
    audioUri: string,
    userId: string,
    personality?: string,
    userName?: string,
    userProfession?: string,
    imageBase64?: string,
    contextData?: string,
  ): Promise<ProcessAudioResult> {
    const audioBase64 = await this.readFileAsBase64(audioUri);

    const body: Record<string, string> = { audio_base64: audioBase64, user_id: userId };
    if (personality) body.personality = personality;
    if (userName) body.user_name = userName;
    if (userProfession) body.user_profession = userProfession;
    if (imageBase64) body.image_base64 = imageBase64;
    if (contextData) body.context_data = contextData;

    const response = await fetch(`${this.backendUrl}/v1/process-audio-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auris-Key': AURIS_API_KEY },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => `${response.status}`);
      throw new Error(`Backend error: ${err}`);
    }

    const { transcript, reply, todos, events } = this.parseAudioResponse(response);
    const buffer = await response.arrayBuffer();
    const savedUri = await saveArrayBufferToFile(buffer, 'auris_response.mp3');
    return { transcript, reply, audioUri: savedUri, todos, events };
  }

  async processAudioStreaming(
    audioUri: string,
    userId: string,
    personality?: string,
    userName?: string,
    userProfession?: string,
    contextData?: string,
  ): Promise<ProcessAudioResult> {
    const audioBase64 = await this.readFileAsBase64(audioUri);

    const body: Record<string, string> = { audio_base64: audioBase64, user_id: userId };
    if (personality) body.personality = personality;
    if (userName) body.user_name = userName;
    if (userProfession) body.user_profession = userProfession;
    if (contextData) body.context_data = contextData;

    const response = await fetch(`${this.backendUrl}/v1/process-audio-stream-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auris-Key': AURIS_API_KEY },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text().catch(() => `${response.status}`);
      throw new Error(`Backend error: ${err}`);
    }

    const { transcript, reply, todos, events } = this.parseAudioResponse(response);
    const buffer = await response.arrayBuffer();
    const savedUri = await saveArrayBufferToFile(buffer, 'auris_stream.mp3');
    return { transcript, reply, audioUri: savedUri, todos, events };
  }

  async processMultiModal(payload: {
    audioUri?: string;
    imageBase64?: string;
    userId: string;
    personality?: string;
    userName?: string;
    userProfession?: string;
    contextData?: string;
  }): Promise<ProcessAudioResult> {
    const { audioUri, imageBase64, userId, personality, userName, userProfession, contextData } = payload;

    if (!audioUri && !imageBase64) throw new Error('processMultiModal: no audio or image provided');

    try {
      if (audioUri && imageBase64) {
        return await this.processAudio(audioUri, userId, personality, userName, userProfession, imageBase64, contextData);
      }

      if (audioUri) {
        return await this.processAudioStreaming(audioUri, userId, personality, userName, userProfession, contextData);
      }

      throw new Error('Image-only payloads require audio — capture audio first');
    } catch (err: any) {
      const isNetworkError =
        err instanceof TypeError ||
        String(err?.message ?? '').toLowerCase().includes('network') ||
        String(err?.message ?? '').toLowerCase().includes('fetch');

      if (isNetworkError && audioUri) {
        const audioBase64 = await this.readFileAsBase64(audioUri).catch(() => null);
        if (audioBase64) {
          await offlineQueue.enqueue({
            audioBase64,
            imageBase64: imageBase64 ?? undefined,
            userId,
            personality,
            userName,
            userProfession,
          });
        }
      }
      throw err;
    }
  }

  // Retry requests that were queued while offline.
  // Call this on app foreground or network restored.
  async flushOfflineQueue(onResult?: (result: ProcessAudioResult) => void): Promise<void> {
    const items = await offlineQueue.peek();
    for (const item of items) {
      try {
        const body: Record<string, string> = {
          audio_base64: item.audioBase64,
          user_id: item.userId,
        };
        if (item.personality) body.personality = item.personality;
        if (item.userName) body.user_name = item.userName;
        if (item.userProfession) body.user_profession = item.userProfession;
        if (item.imageBase64) body.image_base64 = item.imageBase64;

        const endpoint = item.imageBase64
          ? `${this.backendUrl}/v1/process-audio-json`
          : `${this.backendUrl}/v1/process-audio-stream-json`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Auris-Key': AURIS_API_KEY },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const { transcript, reply, todos, events } = this.parseAudioResponse(response);
          const buffer = await response.arrayBuffer();
          const savedUri = await saveArrayBufferToFile(buffer, 'auris_queued.mp3');
          await offlineQueue.remove(item.id);
          onResult?.({ transcript, reply, audioUri: savedUri, todos, events });
        }
      } catch {
        // Leave in queue; will retry next time
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(this.backendUrl, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }
}

async function saveArrayBufferToFile(buffer: ArrayBuffer, filename: string): Promise<string> {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  const base64 = arrayBufferToBase64(buffer);
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

function safeDecodeHeader(raw: string | null): string {
  if (!raw) return '';
  try { return decodeURIComponent(raw); } catch { return raw; }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export const backendService = new BackendService();
