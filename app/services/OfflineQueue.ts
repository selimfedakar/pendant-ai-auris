import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@auris:offline_queue';
const MAX_QUEUE_SIZE = 10;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type QueuedRequest = {
  id: string;
  audioBase64: string;
  imageBase64?: string;
  userId: string;
  personality?: string;
  userName?: string;
  userProfession?: string;
  queuedAt: number;
};

class OfflineQueue {
  private async load(): Promise<QueuedRequest[]> {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      const all: QueuedRequest[] = JSON.parse(raw);
      // Discard entries older than MAX_AGE_MS (stale audio is useless)
      return all.filter((e) => Date.now() - e.queuedAt < MAX_AGE_MS);
    } catch {
      return [];
    }
  }

  private async save(items: QueuedRequest[]): Promise<void> {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  }

  async enqueue(req: Omit<QueuedRequest, 'id' | 'queuedAt'>): Promise<string> {
    const existing = await this.load();
    const entry: QueuedRequest = {
      ...req,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      queuedAt: Date.now(),
    };
    // Cap queue size — drop oldest if full
    const updated = [...existing, entry].slice(-MAX_QUEUE_SIZE);
    await this.save(updated);
    return entry.id;
  }

  async remove(id: string): Promise<void> {
    const existing = await this.load();
    await this.save(existing.filter((e) => e.id !== id));
  }

  async peek(): Promise<QueuedRequest[]> {
    return this.load();
  }

  async count(): Promise<number> {
    return (await this.load()).length;
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }
}

export const offlineQueue = new OfflineQueue();
