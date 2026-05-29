import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

class NotificationService {
  private responseSubscription: Notifications.EventSubscription | null = null;
  private onPressHandler: ((data: Record<string, unknown>) => void) | null = null;
  private ready = false;

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  async scheduleLocal(title: string, body: string, data?: Record<string, unknown>): Promise<void> {
    if (!this.ready) return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {} },
      trigger: null,
    });
  }

  setOnNotificationPress(handler: (data: Record<string, unknown>) => void): void {
    this.onPressHandler = handler;
  }

  async setup(): Promise<void> {
    // setNotificationHandler must run after the native module initialises — never at import time.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    await this.requestPermissions();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('auris-insights', {
        name: 'Auris Insights',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    if (this.responseSubscription) this.responseSubscription.remove();

    this.responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      this.onPressHandler?.(data);
    });

    this.ready = true;
  }

  destroy(): void {
    this.responseSubscription?.remove();
    this.responseSubscription = null;
    this.onPressHandler = null;
    this.ready = false;
  }
}

export const notificationService = new NotificationService();
