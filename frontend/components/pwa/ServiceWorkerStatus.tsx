'use client';

import { useServiceWorker } from '@/hooks/useServiceWorker';
import { formatBytes } from '@/lib/service-worker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * Service Worker Status Component
 * Displays service worker status and cache information
 * Requirements: 21.14
 */
export function ServiceWorkerStatus() {
  const { status, isLoading, cacheUsage, refreshStatus, unregister, clearCaches } = useServiceWorker();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </Card>
    );
  }

  if (!status.isSupported) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Service workers are not supported in this browser
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Service Worker Status</h3>
      
      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <span className={`font-medium ${status.isActive ? 'text-green-600' : 'text-yellow-600'}`}>
            {status.isActive ? 'Active' : status.isRegistered ? 'Registered' : 'Not Registered'}
          </span>
        </div>

        {/* Cache Usage */}
        {cacheUsage && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Cache Usage:</span>
              <span className="font-medium">
                {formatBytes(cacheUsage.usage)} / {formatBytes(cacheUsage.quota)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(cacheUsage.percentage, 100)}%` }}
              />
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {cacheUsage.percentage.toFixed(2)}% of available storage used
            </p>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
          >
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearCaches}
          >
            Clear Cache
          </Button>
          
          {status.isRegistered && (
            <Button
              variant="outline"
              size="sm"
              onClick={unregister}
            >
              Unregister
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
