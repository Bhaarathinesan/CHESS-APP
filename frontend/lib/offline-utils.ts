/**
 * Offline utilities
 * Requirements: 21.12
 */

/**
 * Check if a response is from offline cache
 */
export function isOfflineResponse(response: Response): boolean {
  return response.headers.get('X-Offline-Cache') === 'true';
}

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

/**
 * Wait for online connection
 */
export function waitForOnline(timeout = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const handleOnline = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleOnline);
      resolve(true);
    };

    window.addEventListener('online', handleOnline);

    timeoutId = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      resolve(false);
    }, timeout);
  });
}

/**
 * Prefetch data for offline access
 */
export async function prefetchForOffline(urls: string[]): Promise<void> {
  if (!('caches' in window)) {
    console.warn('Cache API not supported');
    return;
  }

  try {
    const cache = await caches.open('chessarena-offline-data-v1');
    
    await Promise.all(
      urls.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log('Prefetched for offline:', url);
          }
        } catch (error) {
          console.error('Failed to prefetch:', url, error);
        }
      })
    );
  } catch (error) {
    console.error('Failed to prefetch data:', error);
  }
}

/**
 * Clear offline data cache
 */
export async function clearOfflineCache(): Promise<void> {
  if (!('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    const offlineCaches = cacheNames.filter((name) =>
      name.includes('offline-data')
    );

    await Promise.all(
      offlineCaches.map((cacheName) => caches.delete(cacheName))
    );

    console.log('Offline cache cleared');
  } catch (error) {
    console.error('Failed to clear offline cache:', error);
  }
}

/**
 * Get offline cache size
 */
export async function getOfflineCacheSize(): Promise<number> {
  if (!('caches' in window)) {
    return 0;
  }

  try {
    const cache = await caches.open('chessarena-offline-data-v1');
    const keys = await cache.keys();
    
    let totalSize = 0;
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Check if specific data is available offline
 */
export async function isAvailableOffline(url: string): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cache = await caches.open('chessarena-offline-data-v1');
    const response = await cache.match(url);
    return !!response;
  } catch (error) {
    return false;
  }
}
