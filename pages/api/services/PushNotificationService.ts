// services/PushNotificationService.ts

export class PushNotificationService {
    static async requestPermission(): Promise<NotificationPermission> {
      return Notification.requestPermission();
    }
  
    static sendNotification(title: string, options?: NotificationOptions) {
      if (Notification.permission === 'granted') {
        new Notification(title, options);
      }
    }
  }
  