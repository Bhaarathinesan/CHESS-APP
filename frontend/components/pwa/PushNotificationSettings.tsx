'use client';

import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/**
 * Push Notification Settings Component
 * Requirements: 21.13 - Add notification settings to user preferences
 */
export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isPWA,
    subscribe,
    unsubscribe,
    testNotification,
    testServerPush,
  } = usePushNotifications();

  const [testingLocal, setTestingLocal] = useState(false);
  const [testingServer, setTestingServer] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestLocal = () => {
    setTestingLocal(true);
    testNotification();
    setTimeout(() => setTestingLocal(false), 2000);
  };

  const handleTestServer = async () => {
    setTestingServer(true);
    await testServerPush();
    setTimeout(() => setTestingServer(false), 2000);
  };

  if (!isSupported) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <h3 className="font-semibold">Push Notifications Not Supported</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your browser doesn't support push notifications.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h3 className="font-semibold">Push Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications about game events
              </p>
            </div>
          </div>
          {isPWA && (
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
              PWA
            </span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Status:</span>
          {permission === 'granted' && isSubscribed && (
            <span className="text-green-600 dark:text-green-400">✓ Enabled</span>
          )}
          {permission === 'granted' && !isSubscribed && (
            <span className="text-yellow-600 dark:text-yellow-400">⚠ Not Subscribed</span>
          )}
          {permission === 'denied' && (
            <span className="text-red-600 dark:text-red-400">✗ Blocked</span>
          )}
          {permission === 'default' && (
            <span className="text-gray-600 dark:text-gray-400">○ Not Requested</span>
          )}
        </div>

        {/* Permission Denied Warning */}
        {permission === 'denied' && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p className="text-sm text-red-800 dark:text-red-200">
              Notifications are blocked. Please enable them in your browser settings.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {permission !== 'denied' && (
            <Button
              onClick={handleToggle}
              disabled={isLoading}
              variant={isSubscribed ? 'secondary' : 'primary'}
              size="sm"
            >
              {isLoading
                ? 'Processing...'
                : isSubscribed
                ? 'Disable Notifications'
                : 'Enable Notifications'}
            </Button>
          )}

          {permission === 'granted' && (
            <>
              <Button
                onClick={handleTestLocal}
                disabled={testingLocal}
                variant="secondary"
                size="sm"
              >
                {testingLocal ? 'Sent!' : 'Test Local'}
              </Button>

              {isSubscribed && (
                <Button
                  onClick={handleTestServer}
                  disabled={testingServer}
                  variant="secondary"
                  size="sm"
                >
                  {testingServer ? 'Sent!' : 'Test Server Push'}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>• Get notified about game challenges and tournament updates</p>
          <p>• Receive alerts for draw offers and game results</p>
          <p>• Stay updated on achievements and friend activity</p>
          {isPWA && <p>• Enhanced experience for PWA users</p>}
        </div>
      </div>
    </Card>
  );
}
