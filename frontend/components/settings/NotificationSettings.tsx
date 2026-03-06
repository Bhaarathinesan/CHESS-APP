'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Notification Settings Component
 * Requirements: 18.15, 18.16
 */

interface NotificationPreferences {
  game_challenge?: boolean;
  tournament_start?: boolean;
  tournament_confirmation?: boolean;
  tournament_pairing?: boolean;
  opponent_move?: boolean;
  draw_offer?: boolean;
  game_end?: boolean;
  tournament_complete?: boolean;
  achievement_unlocked?: boolean;
  announcement?: boolean;
  friend_online?: boolean;
  rating_change?: boolean;
  tournament_reminder?: boolean;
  security_event?: boolean;
  doNotDisturb?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotifications();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data } = await apiClient.get('/api/users/me');
      setPreferences(data.notificationPreferences || {});
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await apiClient.patch('/api/users/me', {
        notificationPreferences: preferences,
      });

      // Handle push notification subscription
      if (preferences.pushNotifications && !isPushSubscribed) {
        await subscribeToPush();
      } else if (!preferences.pushNotifications && isPushSubscribed) {
        await unsubscribeFromPush();
      }

      setMessage({ type: 'success', text: 'Notification preferences saved successfully' });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const notificationTypes = [
    { key: 'game_challenge', label: 'Game Challenges', description: 'When someone challenges you to a game' },
    { key: 'tournament_start', label: 'Tournament Starting', description: 'When a tournament you joined is about to start' },
    { key: 'tournament_confirmation', label: 'Tournament Registration', description: 'When you register for a tournament' },
    { key: 'tournament_pairing', label: 'Tournament Pairings', description: 'When your tournament pairing is announced' },
    { key: 'opponent_move', label: 'Opponent Moves', description: 'When your opponent makes a move (if not viewing game)' },
    { key: 'draw_offer', label: 'Draw Offers', description: 'When your opponent offers a draw' },
    { key: 'game_end', label: 'Game Results', description: 'When a game ends' },
    { key: 'tournament_complete', label: 'Tournament Results', description: 'When a tournament completes' },
    { key: 'achievement_unlocked', label: 'Achievements', description: 'When you unlock an achievement' },
    { key: 'announcement', label: 'Announcements', description: 'Platform announcements from admins' },
    { key: 'friend_online', label: 'Friends Online', description: 'When a friend comes online' },
    { key: 'rating_change', label: 'Rating Changes', description: 'When your rating changes after a game' },
    { key: 'tournament_reminder', label: 'Tournament Reminders', description: 'Reminders before tournaments start' },
    { key: 'security_event', label: 'Security Alerts', description: 'Important security events on your account' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Notification Preferences</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize which notifications you want to receive
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Do Not Disturb Mode */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200">Do Not Disturb Mode</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Suppress all notifications temporarily
            </p>
          </div>
          <button
            onClick={() => handleToggle('doNotDisturb')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.doNotDisturb ? 'bg-yellow-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.doNotDisturb ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification Channels */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Channels</h3>

        <div className="space-y-3">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <h4 className="font-medium">Email Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications via email
              </p>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.emailNotifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <h4 className="font-medium">Browser Push Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {!isPushSupported
                  ? 'Not supported in your browser'
                  : pushPermission === 'denied'
                  ? 'Permission denied - please enable in browser settings'
                  : 'Receive push notifications in your browser'}
              </p>
            </div>
            <button
              onClick={() => handleToggle('pushNotifications')}
              disabled={!isPushSupported || pushPermission === 'denied'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.pushNotifications && isPushSupported && pushPermission !== 'denied'
                  ? 'bg-blue-600'
                  : 'bg-gray-300 dark:bg-gray-600'
              } ${!isPushSupported || pushPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Types</h3>

        <div className="space-y-2">
          {notificationTypes.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="flex-1">
                <h4 className="font-medium">{label}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
              </div>
              <button
                onClick={() => handleToggle(key as keyof NotificationPreferences)}
                disabled={preferences.doNotDisturb}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences[key as keyof NotificationPreferences] && !preferences.doNotDisturb
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                } ${preferences.doNotDisturb ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences[key as keyof NotificationPreferences] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
