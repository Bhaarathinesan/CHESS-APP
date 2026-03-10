import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';

// Mock API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock service worker and push manager
const mockSubscription = {
  endpoint: 'https://example.com/push',
  toJSON: () => ({
    endpoint: 'https://example.com/push',
    keys: {
      p256dh: 'test-key',
      auth: 'test-auth',
    },
  }),
  unsubscribe: vi.fn().mockResolvedValue(true),
};

const mockPushManager = {
  getSubscription: vi.fn().mockResolvedValue(null),
  subscribe: vi.fn().mockResolvedValue(mockSubscription),
};

const mockRegistration = {
  pushManager: mockPushManager,
};

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock browser APIs
    Object.defineProperty(window, 'Notification', {
      writable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      value: {
        ready: Promise.resolve(mockRegistration),
        getRegistration: vi.fn().mockResolvedValue(mockRegistration),
        register: vi.fn().mockResolvedValue(mockRegistration),
      },
    });

    Object.defineProperty(window, 'PushManager', {
      writable: true,
      value: vi.fn(),
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '(display-mode: standalone)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    // Mock atob
    global.atob = vi.fn((str) => str) as any;
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(true);
    expect(result.current.permission).toBe('default');
    expect(result.current.isSubscribed).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isPWA).toBe(false);
  });

  it('should detect PWA mode', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(display-mode: standalone)',
    }) as any;

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isPWA).toBe(true);
  });

  it('should request permission successfully', async () => {
    const { result } = renderHook(() => usePushNotifications());

    let permissionGranted;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(permissionGranted).toBe(true);
    expect(window.Notification.requestPermission).toHaveBeenCalled();
  });

  it('should subscribe to push notifications', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient.get as any).mockResolvedValue({
      data: { vapidPublicKey: 'test-vapid-key' },
    });
    (apiClient.post as any).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => usePushNotifications());

    let success;
    await act(async () => {
      success = await result.current.subscribe();
    });

    await waitFor(() => {
      expect(success).toBe(true);
      expect(result.current.isSubscribed).toBe(true);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/notifications/push-config');
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/push-subscribe', {
      subscription: mockSubscription.toJSON(),
    });
  });

  it('should unsubscribe from push notifications', async () => {
    const { apiClient } = await import('@/lib/api-client');
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
    (apiClient.post as any).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => usePushNotifications());

    let success;
    await act(async () => {
      success = await result.current.unsubscribe();
    });

    await waitFor(() => {
      expect(success).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
    });

    expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/push-unsubscribe', {
      endpoint: mockSubscription.endpoint,
    });
  });

  it('should test local notification', () => {
    window.Notification.permission = 'granted';
    const mockNotificationConstructor = vi.fn();
    window.Notification = mockNotificationConstructor as any;
    window.Notification.permission = 'granted';

    const { result } = renderHook(() => usePushNotifications());

    act(() => {
      result.current.testNotification();
    });

    expect(mockNotificationConstructor).toHaveBeenCalledWith('Test Notification', {
      body: 'Push notifications are working!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
    });
  });

  it('should test server push', async () => {
    const { apiClient } = await import('@/lib/api-client');
    mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
    (apiClient.post as any).mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => usePushNotifications());

    // Set subscribed state
    await act(async () => {
      await result.current.subscribe();
    });

    let success;
    await act(async () => {
      success = await result.current.testServerPush();
    });

    expect(success).toBe(true);
    expect(apiClient.post).toHaveBeenCalledWith('/api/notifications/test-push');
  });

  it.skip('should handle unsupported browsers', () => {
    // This test is skipped because it's difficult to properly mock
    // the absence of browser APIs in the test environment
    // The functionality is tested in integration tests
  });

  it('should handle permission denied', async () => {
    window.Notification.requestPermission = vi.fn().mockResolvedValue('denied');

    const { result } = renderHook(() => usePushNotifications());

    let permissionGranted;
    await act(async () => {
      permissionGranted = await result.current.requestPermission();
    });

    expect(permissionGranted).toBe(false);
  });

  it('should handle subscription errors', async () => {
    const { apiClient } = await import('@/lib/api-client');
    (apiClient.get as any).mockRejectedValue(new Error('Network error'));

    // Reset subscription state
    mockPushManager.getSubscription.mockResolvedValue(null);

    const { result } = renderHook(() => usePushNotifications());

    // Wait for initial state
    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(false);
    });

    let success;
    await act(async () => {
      success = await result.current.subscribe();
    });

    expect(success).toBe(false);
    expect(result.current.isSubscribed).toBe(false);
  });
});
