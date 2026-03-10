import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

export interface PushNotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  isPWA: boolean;
}

/**
 * Hook for managing browser push notifications
 * Requirements: 18.13, 21.13
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    // Check if running as PWA
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true ||
                      document.referrer.includes('android-app://');
    setIsPWA(isPWAMode);

    if (supported && window.Notification) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  /**
   * Check if user is already subscribed
   * Requirements: 21.13
   */
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  /**
   * Request notification permission
   * Requirements: 21.13
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  };

  /**
   * Subscribe to push notifications
   * Requirements: 21.13
   */
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return false;
        }
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const { data: config } = await apiClient.get('/api/notifications/push-config');
      const vapidPublicKey = config.vapidPublicKey;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      await apiClient.post('/api/notifications/push-subscribe', {
        subscription: subscription.toJSON(),
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Unsubscribe from push notifications
   * Requirements: 21.13
   */
  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Notify server
        await apiClient.post('/api/notifications/push-unsubscribe', {
          endpoint: subscription.endpoint,
        });

        setIsSubscribed(false);
      }

      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Test push notification (local)
   * Requirements: 21.13
   */
  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'Push notifications are working!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
      });
    }
  };

  /**
   * Request test push from server
   * Requirements: 21.13
   */
  const testServerPush = async (): Promise<boolean> => {
    if (!isSubscribed) {
      console.warn('Not subscribed to push notifications');
      return false;
    }

    try {
      await apiClient.post('/api/notifications/test-push');
      return true;
    } catch (error) {
      console.error('Error testing server push:', error);
      return false;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isPWA,
    requestPermission,
    subscribe,
    unsubscribe,
    testNotification,
    testServerPush,
  };
}

/**
 * Convert VAPID public key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
