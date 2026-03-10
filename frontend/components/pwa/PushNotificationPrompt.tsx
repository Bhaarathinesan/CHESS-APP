'use client';

import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * Push Notification Permission Prompt
 * Requirements: 21.13 - Request notification permissions from users
 */
export function PushNotificationPrompt() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isPWA,
    subscribe,
  } = usePushNotifications();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if prompt should be shown
    const dismissed = localStorage.getItem('push-prompt-dismissed');
    const lastShown = localStorage.getItem('push-prompt-last-shown');
    const now = Date.now();

    // Show prompt if:
    // 1. Supported and not subscribed
    // 2. Not dismissed permanently
    // 3. Not shown in last 7 days
    if (
      isSupported &&
      !isSubscribed &&
      permission === 'default' &&
      !dismissed &&
      (!lastShown || now - parseInt(lastShown) > 7 * 24 * 60 * 60 * 1000)
    ) {
      // Show after 10 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
        localStorage.setItem('push-prompt-last-shown', now.toString());
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed, permission]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
  };

  const handleNeverShow = () => {
    localStorage.setItem('push-prompt-dismissed', 'true');
    setShowPrompt(false);
    setIsDismissed(true);
  };

  if (!showPrompt || isDismissed || !isSupported) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <Card className="p-4 shadow-lg border-2 border-blue-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-3xl">🔔</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              Enable Push Notifications
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Get notified about game challenges, tournament updates, and important events.
              {isPWA && ' Perfect for PWA users!'}
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleEnable}
                disabled={isLoading}
                size="sm"
                variant="primary"
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="secondary"
              >
                Later
              </Button>
              <Button
                onClick={handleNeverShow}
                size="sm"
                variant="ghost"
              >
                Never
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
