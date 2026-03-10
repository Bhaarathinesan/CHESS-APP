'use client';

import { useEffect, useState } from 'react';
import {
  registerServiceWorker,
  unregisterServiceWorker,
  getServiceWorkerStatus,
  clearAllCaches,
  getCacheStorageUsage,
  type ServiceWorkerStatus,
} from '@/lib/service-worker';

/**
 * Hook for managing service worker
 * Requirements: 21.14
 */
export function useServiceWorker() {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isActive: false,
    registration: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [cacheUsage, setCacheUsage] = useState<{
    usage: number;
    quota: number;
    percentage: number;
  } | null>(null);

  // Register service worker on mount
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      try {
        // Register service worker
        await registerServiceWorker();
        
        // Get status
        const swStatus = await getServiceWorkerStatus();
        setStatus(swStatus);
        
        // Get cache usage
        const usage = await getCacheStorageUsage();
        setCacheUsage(usage);
      } catch (error) {
        console.error('Failed to initialize service worker:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Refresh status
  const refreshStatus = async () => {
    const swStatus = await getServiceWorkerStatus();
    setStatus(swStatus);
    
    const usage = await getCacheStorageUsage();
    setCacheUsage(usage);
  };

  // Unregister service worker
  const unregister = async () => {
    const success = await unregisterServiceWorker();
    
    if (success) {
      await refreshStatus();
    }
    
    return success;
  };

  // Clear caches
  const clearCaches = async () => {
    await clearAllCaches();
    await refreshStatus();
  };

  return {
    status,
    isLoading,
    cacheUsage,
    refreshStatus,
    unregister,
    clearCaches,
  };
}
