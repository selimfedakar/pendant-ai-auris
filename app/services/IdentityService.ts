import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { deviceCodeService } from './DeviceCodeService';

const USER_ID_KEY = '@auris:user_id';

class IdentityService {
  private userId: string | null = null;

  async getUserId(): Promise<string> {
    // If a device code is stored, use it as the user identity.
    const deviceCode = await deviceCodeService.getCode();
    if (deviceCode) {
      this.userId = deviceCode;
      return deviceCode;
    }

    // Fallback: UUID-based identity (existing logic).
    if (this.userId) return this.userId;
    const stored = await AsyncStorage.getItem(USER_ID_KEY);
    if (stored) { this.userId = stored; return stored; }
    const newId = Crypto.randomUUID();
    await AsyncStorage.setItem(USER_ID_KEY, newId);
    this.userId = newId;
    return newId;
  }
}

export const identityService = new IdentityService();
