import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  NAME: '@auris:name',
  PROFESSION: '@auris:profession',
  PERSONALITY: '@auris:personality',
} as const;

export type UserProfile = {
  name: string;
  profession: string;
  personality: string;
};

const DEFAULT: UserProfile = { name: '', profession: '', personality: 'companion' };

class ProfileService {
  async load(): Promise<UserProfile> {
    const [name, profession, personality] = await Promise.all([
      AsyncStorage.getItem(KEYS.NAME),
      AsyncStorage.getItem(KEYS.PROFESSION),
      AsyncStorage.getItem(KEYS.PERSONALITY),
    ]);
    return {
      name: name ?? DEFAULT.name,
      profession: profession ?? DEFAULT.profession,
      personality: personality ?? DEFAULT.personality,
    };
  }

  async save(patch: Partial<UserProfile>): Promise<void> {
    const ops: Promise<void>[] = [];
    if (patch.name !== undefined) ops.push(AsyncStorage.setItem(KEYS.NAME, patch.name));
    if (patch.profession !== undefined) ops.push(AsyncStorage.setItem(KEYS.PROFESSION, patch.profession));
    if (patch.personality !== undefined) ops.push(AsyncStorage.setItem(KEYS.PERSONALITY, patch.personality));
    await Promise.all(ops);
  }
}

export const profileService = new ProfileService();
