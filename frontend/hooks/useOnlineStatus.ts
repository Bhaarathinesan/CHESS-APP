'use client';

import { useEffect, useState } from 'react';

/**
 * Hook for detecting online/offline status
 * Requirements: 21.12
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Check initial status
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    // Handle online event
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      
      // Reset wasOffline after 5 seconds
      setTimeout(() => {
        setWasOffline(false);
      }, 5000);
    };

    // Handle offline event
    const handleOffline = () => {
      setIsOnline(false);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
  };
}
