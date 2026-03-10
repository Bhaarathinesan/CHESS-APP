'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/Button';
import { X, Download, Share } from 'lucide-react';

/**
 * PWA Install Prompt Component
 * Requirements: 21.15
 */

interface InstallPromptProps {
  variant?: 'banner' | 'modal' | 'button';
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function InstallPrompt({ 
  variant = 'banner',
  onInstall,
  onDismiss,
}: InstallPromptProps) {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    canPrompt,
    promptInstall,
    dismissPrompt,
  } = usePWAInstall();

  // Don't show if already installed or can't prompt
  if (isInstalled || !canPrompt) {
    return null;
  }

  const handleInstall = async () => {
    const result = await promptInstall();
    
    if (result.outcome === 'accepted') {
      onInstall?.();
    }
  };

  const handleDismiss = () => {
    dismissPrompt();
    onDismiss?.();
  };

  // iOS-specific instructions
  if (isIOS) {
    return (
      <IOSInstallInstructions 
        variant={variant}
        onDismiss={handleDismiss}
      />
    );
  }

  // Standard install prompt for Chrome, Edge, etc.
  if (!isInstallable) {
    return null;
  }

  if (variant === 'button') {
    return (
      <Button
        onClick={handleInstall}
        variant="primary"
        className="flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        Install App
      </Button>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Install ChessArena
            </h3>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Install ChessArena for a better experience with offline access, 
            faster loading, and push notifications.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={handleInstall}
              variant="primary"
              className="flex-1"
            >
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="secondary"
              className="flex-1"
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: banner variant
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-40 md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Download className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold mb-1">Install ChessArena</h4>
          <p className="text-sm text-blue-100 mb-3">
            Get the app for offline access and faster loading
          </p>
          
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              variant="secondary"
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              Install
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-blue-700"
            >
              Not Now
            </Button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-100 hover:text-white"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * iOS-specific install instructions
 */
function IOSInstallInstructions({ 
  variant,
  onDismiss,
}: { 
  variant: 'banner' | 'modal' | 'button';
  onDismiss: () => void;
}) {
  if (variant === 'button') {
    return null; // iOS doesn't support programmatic install
  }

  const content = (
    <>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Share className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold mb-1">Install ChessArena</h4>
          <p className="text-sm mb-2">
            To install this app on your iPhone:
          </p>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Tap the Share button <Share className="w-3 h-3 inline" /></li>
            <li>Scroll down and tap "Add to Home Screen"</li>
            <li>Tap "Add" to confirm</li>
          </ol>
        </div>
        
        <button
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </>
  );

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-gray-900 dark:text-white">
          {content}
          <div className="mt-4">
            <Button
              onClick={onDismiss}
              variant="secondary"
              className="w-full"
            >
              Got it
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default: banner variant
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-40 md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-lg">
      {content}
    </div>
  );
}
