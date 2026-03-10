/**
 * Service Worker Utilities Tests
 * Requirements: 21.14, 33.13
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isServiceWorkerSupported,
  registerServiceWorker,
  unregisterServiceWorker,
  getServiceWorkerStatus,
  clearAllCaches,
  getCacheStorageUsage,
  formatBytes,
} from '../service-worker';

// Mock navigator.serviceWorker
const mockServiceWorker = {
  register: vi.fn(),
  getRegistration: vi.fn(),
};

const mockRegistration = {
  update: vi.fn(),
  unregister: vi.fn(),
  addEventListener: vi.fn(),
  installing: null,
  active: {
    state: 'activated',
  },
};

describe('Service Worker Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window and navigator
    Object.defineProperty(global, 'window', {
      value: {
        confirm: vi.fn(() => true),
        location: {
          reload: vi.fn(),
        },
      },
      writable: true,
    });
    
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
      configurable: true,
    });
  });

  describe('isServiceWorkerSupported', () => {
    it('should return true when service workers are supported', () => {
      expect(isServiceWorkerSupported()).toBe(true);
    });

    it('should return false when service workers are not supported', () => {
      const originalServiceWorker = global.navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;
      
      expect(isServiceWorkerSupported()).toBe(false);
      
      // Restore
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: originalServiceWorker,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('registerServiceWorker', () => {
    it('should register service worker successfully', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      const registration = await registerServiceWorker();

      expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', {
        scope: '/',
      });
      expect(registration).toBe(mockRegistration);
      expect(mockRegistration.update).toHaveBeenCalled();
    });

    it('should return null when service workers are not supported', async () => {
      const originalServiceWorker = global.navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      const registration = await registerServiceWorker();

      expect(registration).toBeNull();
      
      // Restore
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: originalServiceWorker,
        writable: true,
        configurable: true,
      });
    });

    it('should handle registration errors', async () => {
      const error = new Error('Registration failed');
      mockServiceWorker.register.mockRejectedValue(error);

      const registration = await registerServiceWorker();

      expect(registration).toBeNull();
    });

    it('should listen for service worker updates', async () => {
      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      await registerServiceWorker();

      expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
        'updatefound',
        expect.any(Function)
      );
    });
  });

  describe('unregisterServiceWorker', () => {
    it('should unregister service worker successfully', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);
      mockRegistration.unregister.mockResolvedValue(true);

      const success = await unregisterServiceWorker();

      expect(mockServiceWorker.getRegistration).toHaveBeenCalled();
      expect(mockRegistration.unregister).toHaveBeenCalled();
      expect(success).toBe(true);
    });

    it('should return false when no registration exists', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(null);

      const success = await unregisterServiceWorker();

      expect(success).toBe(false);
    });

    it('should return false when service workers are not supported', async () => {
      const originalServiceWorker = global.navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      const success = await unregisterServiceWorker();

      expect(success).toBe(false);
      
      // Restore
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: originalServiceWorker,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('getServiceWorkerStatus', () => {
    it('should return correct status when service worker is active', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(mockRegistration);

      const status = await getServiceWorkerStatus();

      expect(status).toEqual({
        isSupported: true,
        isRegistered: true,
        isActive: true,
        registration: mockRegistration,
      });
    });

    it('should return correct status when service worker is not registered', async () => {
      mockServiceWorker.getRegistration.mockResolvedValue(null);

      const status = await getServiceWorkerStatus();

      expect(status).toEqual({
        isSupported: true,
        isRegistered: false,
        isActive: false,
        registration: null,
      });
    });

    it('should return not supported status when service workers are not available', async () => {
      const originalServiceWorker = global.navigator.serviceWorker;
      // @ts-ignore
      delete global.navigator.serviceWorker;

      const status = await getServiceWorkerStatus();

      expect(status).toEqual({
        isSupported: false,
        isRegistered: false,
        isActive: false,
        registration: null,
      });
      
      // Restore
      Object.defineProperty(global.navigator, 'serviceWorker', {
        value: originalServiceWorker,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('clearAllCaches', () => {
    it('should clear all caches successfully', async () => {
      const mockCaches = {
        keys: vi.fn().mockResolvedValue(['cache1', 'cache2']),
        delete: vi.fn().mockResolvedValue(true),
      };

      // Mock window.caches
      Object.defineProperty(global, 'window', {
        value: {
          caches: mockCaches,
        },
        writable: true,
        configurable: true,
      });

      // Also set global.caches for the actual caches API calls
      Object.defineProperty(global, 'caches', {
        value: mockCaches,
        writable: true,
        configurable: true,
      });

      await clearAllCaches();

      expect(mockCaches.keys).toHaveBeenCalled();
      expect(mockCaches.delete).toHaveBeenCalledWith('cache1');
      expect(mockCaches.delete).toHaveBeenCalledWith('cache2');
    });

    it('should handle when Cache API is not supported', async () => {
      Object.defineProperty(global, 'window', {
        value: {},
        writable: true,
        configurable: true,
      });

      await expect(clearAllCaches()).resolves.not.toThrow();
    });
  });

  describe('getCacheStorageUsage', () => {
    it('should return storage usage information', async () => {
      const mockStorage = {
        estimate: vi.fn().mockResolvedValue({
          usage: 1024 * 1024, // 1 MB
          quota: 1024 * 1024 * 100, // 100 MB
        }),
      };

      Object.defineProperty(global.navigator, 'storage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const usage = await getCacheStorageUsage();

      expect(usage).toEqual({
        usage: 1024 * 1024,
        quota: 1024 * 1024 * 100,
        percentage: 1,
      });
    });

    it('should return null when Storage API is not supported', async () => {
      const originalStorage = global.navigator.storage;
      // @ts-ignore
      delete global.navigator.storage;

      const usage = await getCacheStorageUsage();

      expect(usage).toBeNull();
      
      // Restore
      Object.defineProperty(global.navigator, 'storage', {
        value: originalStorage,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1024 * 1024 * 1024 * 1.75)).toBe('1.75 GB');
    });
  });
});
