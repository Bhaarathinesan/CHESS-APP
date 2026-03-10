'use client';

import { useState, useEffect } from 'react';
import { InstallPrompt } from './InstallPrompt';
import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * PWA Provider Component
 * Manages global PWA install prompt display
 * Requirements: 21.15
 */

interface PWAProviderProps {
  children: React.ReactNode;
  showPrompt?: boolean;
  promptVariant?: 'banner' | 'modal';
  promptDelay?: number; // Delay in ms before showing prompt
}

export function PWAProvider({ 
  children,
  showPrompt = true,
  promptVariant = 'banner',
  promptDelay = 3000, // 3 seconds default
}: PWAProviderProps) {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const { canPrompt, isInstalled } = usePWAInstall();

  useEffect(() => {
    if (!showPrompt || isInstalled || !canPrompt) {
      return;
    }

    // Delay showing the prompt to avoid interrupting user
    const timer = setTimeout(() => {
      setShowInstallPrompt(true);
    }, promptDelay);

    return () => clearTimeout(timer);
  }, [showPrompt, isInstalled, canPrompt, promptDelay]);

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  const handleInstall = () => {
    setShowInstallPrompt(false);
  };

  return (
    <>
      {children}
      {showInstallPrompt && (
        <InstallPrompt
          variant={promptVariant}
          onInstall={handleInstall}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
}
