import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@auris:history';

export type HistoryEntry = {
  id: string;
  summary: string;
  preview: string;
  mode: 'solo' | 'social';
  ts: number;
};

class HistoryService {
  async load(): Promise<HistoryEntry[]> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  }

  async append(entry: HistoryEntry): Promise<void> {
    const existing = await this.load();
    const updated = [entry, ...existing].slice(0, 100);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  }
}

export const historyService = new HistoryService();
