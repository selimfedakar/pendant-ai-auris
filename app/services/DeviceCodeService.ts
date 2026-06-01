import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_CODE_KEY = '@auris:device_code';

const ADMIN_CODE = '003';
const CUSTOMER_CODE_REGEX = /^AUR-[A-Z0-9]{6}$/;

class DeviceCodeService {
  async getCode(): Promise<string | null> {
    return AsyncStorage.getItem(DEVICE_CODE_KEY);
  }

  async setCode(code: string): Promise<void> {
    await AsyncStorage.setItem(DEVICE_CODE_KEY, code);
  }

  async clearCode(): Promise<void> {
    await AsyncStorage.removeItem(DEVICE_CODE_KEY);
  }

  isAdminCode(code: string): boolean {
    return code === ADMIN_CODE;
  }

  isValidFormat(code: string): boolean {
    return code === ADMIN_CODE || CUSTOMER_CODE_REGEX.test(code);
  }
}

export const deviceCodeService = new DeviceCodeService();
