'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for managing PWA installation
 * Requirements: 21.15
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  canPrompt: boolean;
  isDismissed: boolean;
}

const DISMISSAL_KEY = 'pwa-install-dismissed';
const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<PWAInstallState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    canPrompt: false,
    isDismissed: false,
  });

  // Check if user dismissed the prompt recently
  const checkDismissal = useCallback(() => {
    if (typeof window === 'undefined') return true;

    const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
    if (!dismissedAt) return false;

    const dismissedTime = parseInt(dismissedAt, 10);
    const now = Date.now();

    // Check if dismissal has expired
    if (now - dismissedTime > DISMISSAL_DURATION) {
      localStorage.removeItem(DISMISSAL_KEY);
      return false;
    }

    return true;
  }, []);

  // Check if running as installed PWA
  const checkIfInstalled = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Check if running as PWA on iOS
    const isIOSPWA = (window.navigator as any).standalone === true;

    return isStandalone || isIOSPWA;
  }, []);

  // Check if iOS device
  const checkIfIOS = useCallback(() => {
    if (typeof window === 'undefined') return false;

    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  }, []);

  useEffect(() => {
    const isInstalled = checkIfInstalled();
    const isIOS = checkIfIOS();
    const isDismissed = checkDismissal();

    setInstallState((prev) => ({
      ...prev,
      isInstalled,
      isIOS,
      isDismissed,
    }));

    // Don't set up listeners if already installed
    if (isInstalled) {
      return;
    }

    // Handle beforeinstallprompt event (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      setInstallState((prev) => ({
        ...prev,
        isInstallable: true,
        canPrompt: !isDismissed,
      }));
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        canPrompt: false,
      }));

      // Track installation
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'pwa_install', {
          event_category: 'engagement',
          event_label: 'PWA Installed',
        });
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkIfInstalled, checkIfIOS, checkDismissal]);

  // Prompt user to install
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('Install prompt not available');
      return { outcome: 'unavailable' as const };
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for user response
      const choiceResult = await deferredPrompt.userChoice;

      // Track user choice
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'pwa_install_prompt', {
          event_category: 'engagement',
          event_label: choiceResult.outcome,
        });
      }

      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setInstallState((prev) => ({
        ...prev,
        canPrompt: false,
      }));

      return choiceResult;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return { outcome: 'error' as const };
    }
  }, [deferredPrompt]);

  // Dismiss the install prompt
  const dismissPrompt = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Store dismissal timestamp
    localStorage.setItem(DISMISSAL_KEY, Date.now().toString());

    setInstallState((prev) => ({
      ...prev,
      canPrompt: false,
      isDismissed: true,
    }));

    // Track dismissal
    if ((window as any).gtag) {
      (window as any).gtag('event', 'pwa_install_dismissed', {
        event_category: 'engagement',
        event_label: 'Install Prompt Dismissed',
      });
    }
  }, []);

  // Reset dismissal (for testing or user preference)
  const resetDismissal = useCallback(() => {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(DISMISSAL_KEY);
    setInstallState((prev) => ({
      ...prev,
      canPrompt: prev.isInstallable && !prev.isInstalled,
      isDismissed: false,
    }));
  }, []);

  return {
    ...installState,
    promptInstall,
    dismissPrompt,
    resetDismissal,
  };
}
