import {
  isOfflineResponse,
  isOnline,
  waitForOnline,
  prefetchForOffline,
  clearOfflineCache,
  getOfflineCacheSize,
  isAvailableOffline,
} from '../offline-utils';
import { vi } from 'vitest';

describe('offline-utils', () => {
  describe('isOfflineResponse', () => {
    it('should return true for offline cached responses', () => {
      const response = new Response('{}', {
        headers: { 'X-Offline-Cache': 'true' },
      });

      expect(isOfflineResponse(response)).toBe(true);
    });

    it('should return false for regular responses', () => {
      const response = new Response('{}');

      expect(isOfflineResponse(response)).toBe(false);
    });
  });

  describe('isOnline', () => {
    let onlineGetter: any;

    beforeEach(() => {
      onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
    });

    afterEach(() => {
      onlineGetter.mockRestore();
    });

    it('should return true when online', () => {
      onlineGetter.mockReturnValue(true);
      expect(isOnline()).toBe(true);
    });

    it('should return false when offline', () => {
      onlineGetter.mockReturnValue(false);
      expect(isOnline()).toBe(false);
    });
  });

  describe('waitForOnline', () => {
    let onlineGetter: any;

    beforeEach(() => {
      vi.useFakeTimers();
      onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
    });

    afterEach(() => {
      vi.useRealTimers();
      onlineGetter.mockRestore();
    });

    it('should resolve immediately if already online', async () => {
      onlineGetter.mockReturnValue(true);

      const result = await waitForOnline();
      expect(result).toBe(true);
    });

    it('should resolve when going online', async () => {
      onlineGetter.mockReturnValue(false);

      const promise = waitForOnline();

      // Simulate going online
      setTimeout(() => {
        window.dispatchEvent(new Event('online'));
      }, 1000);

      vi.advanceTimersByTime(1000);

      const result = await promise;
      expect(result).toBe(true);
    });

    it('should timeout if not going online', async () => {
      onlineGetter.mockReturnValue(false);

      const promise = waitForOnline(1000);

      vi.advanceTimersByTime(1000);

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe('prefetchForOffline', () => {
    let mockCache: any;

    beforeEach(() => {
      mockCache = {
        put: vi.fn(),
      };

      global.caches = {
        open: vi.fn().mockResolvedValue(mockCache),
      } as any;

      global.fetch = vi.fn().mockResolvedValue(
        new Response('{}', { status: 200 })
      );
    });

    it('should prefetch URLs and cache them', async () => {
      const urls = ['/api/games/1', '/api/users/me'];

      await prefetchForOffline(urls);

      expect(global.caches.open).toHaveBeenCalledWith('chessarena-offline-data-v1');
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockCache.put).toHaveBeenCalledTimes(2);
    });

    it('should handle fetch errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const urls = ['/api/games/1'];

      await expect(prefetchForOffline(urls)).resolves.not.toThrow();
    });

    it('should skip non-ok responses', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('{}', { status: 404 })
      );

      const urls = ['/api/games/1'];

      await prefetchForOffline(urls);

      expect(mockCache.put).not.toHaveBeenCalled();
    });
  });

  describe('clearOfflineCache', () => {
    beforeEach(() => {
      global.caches = {
        keys: vi.fn().mockResolvedValue([
          'chessarena-offline-data-v1',
          'chessarena-static-v1',
          'other-cache',
        ]),
        delete: vi.fn().mockResolvedValue(true),
      } as any;
    });

    it('should delete offline data caches', async () => {
      await clearOfflineCache();

      expect(global.caches.delete).toHaveBeenCalledWith('chessarena-offline-data-v1');
      expect(global.caches.delete).not.toHaveBeenCalledWith('chessarena-static-v1');
      expect(global.caches.delete).not.toHaveBeenCalledWith('other-cache');
    });
  });

  describe('getOfflineCacheSize', () => {
    let mockCache: any;

    beforeEach(() => {
      mockCache = {
        keys: vi.fn().mockResolvedValue([
          new Request('http://localhost/api/games/1'),
          new Request('http://localhost/api/users/me'),
        ]),
        match: vi.fn().mockImplementation((request: Request) => {
          return Promise.resolve(
            new Response(JSON.stringify({ data: 'test' }))
          );
        }),
      };

      global.caches = {
        open: vi.fn().mockResolvedValue(mockCache),
      } as any;
    });

    it('should calculate total cache size', async () => {
      const size = await getOfflineCacheSize();

      expect(size).toBeGreaterThan(0);
      expect(mockCache.keys).toHaveBeenCalled();
    });

    it('should return 0 on error', async () => {
      global.caches = {
        open: vi.fn().mockRejectedValue(new Error('Cache error')),
      } as any;

      const size = await getOfflineCacheSize();
      expect(size).toBe(0);
    });
  });

  describe('isAvailableOffline', () => {
    let mockCache: any;

    beforeEach(() => {
      mockCache = {
        match: vi.fn(),
      };

      global.caches = {
        open: vi.fn().mockResolvedValue(mockCache),
      } as any;
    });

    it('should return true if URL is cached', async () => {
      mockCache.match.mockResolvedValue(new Response('{}'));

      const result = await isAvailableOffline('/api/games/1');
      expect(result).toBe(true);
    });

    it('should return false if URL is not cached', async () => {
      mockCache.match.mockResolvedValue(undefined);

      const result = await isAvailableOffline('/api/games/1');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      global.caches = {
        open: vi.fn().mockRejectedValue(new Error('Cache error')),
      } as any;

      const result = await isAvailableOffline('/api/games/1');
      expect(result).toBe(false);
    });
  });
});
