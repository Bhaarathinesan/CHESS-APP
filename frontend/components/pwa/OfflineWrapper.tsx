'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ReactNode } from 'react';

interface OfflineWrapperProps {
  children: ReactNode;
  requiresOnline?: boolean;
  offlineMessage?: string;
  offlineFallback?: ReactNode;
}

/**
 * Wrapper component that handles offline state
 * Requirements: 21.12
 */
export function OfflineWrapper({
  children,
  requiresOnline = false,
  offlineMessage = 'This feature requires an internet connection',
  offlineFallback,
}: OfflineWrapperProps) {
  const { isOffline } = useOnlineStatus();

  // If online or doesn't require online, show children
  if (!isOffline || !requiresOnline) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (offlineFallback) {
    return <>{offlineFallback}</>;
  }

  // Show default offline message
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          className="w-full h-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
        You're Offline
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md">
        {offlineMessage}
      </p>
    </div>
  );
}
