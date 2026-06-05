import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  NAME: '@auris:name',
  PROFESSION: '@auris:profession',
  PERSONALITY: '@auris:personality',
  PHOTO_URI: '@auris:photo_uri',
} as const;

export type UserProfile = {
  name: string;
  profession: string;
  personality: string;
  photoUri?: string;
};

const DEFAULT: UserProfile = { name: '', profession: '', personality: 'companion' };

class ProfileService {
  async load(): Promise<UserProfile> {
    const [name, profession, personality, photoUri] = await Promise.all([
      AsyncStorage.getItem(KEYS.NAME),
      AsyncStorage.getItem(KEYS.PROFESSION),
      AsyncStorage.getItem(KEYS.PERSONALITY),
      AsyncStorage.getItem(KEYS.PHOTO_URI),
    ]);
    return {
      name: name ?? DEFAULT.name,
      profession: profession ?? DEFAULT.profession,
      personality: personality ?? DEFAULT.personality,
      photoUri: photoUri ?? undefined,
    };
  }

  async save(patch: Partial<UserProfile>): Promise<void> {
    const ops: Promise<void>[] = [];
    if (patch.name !== undefined) ops.push(AsyncStorage.setItem(KEYS.NAME, patch.name));
    if (patch.profession !== undefined) ops.push(AsyncStorage.setItem(KEYS.PROFESSION, patch.profession));
    if (patch.personality !== undefined) ops.push(AsyncStorage.setItem(KEYS.PERSONALITY, patch.personality));
    if (patch.photoUri !== undefined) ops.push(AsyncStorage.setItem(KEYS.PHOTO_URI, patch.photoUri));
    await Promise.all(ops);
  }

  async clearPhoto(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.PHOTO_URI);
  }
}

export const profileService = new ProfileService();
