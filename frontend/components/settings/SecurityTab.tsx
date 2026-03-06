'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Security Tab Component
 * Allows users to change password, enable 2FA, and manage sessions
 */

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export function SecurityTab() {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isTogglingTwoFactor, setIsTogglingTwoFactor] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSecuritySettings();
    loadSessions();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const data = await apiClient.get<any>('/api/users/me');
      setTwoFactorEnabled(data.twoFactorEnabled || false);
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const loadSessions = async () => {
    try {
      // Mock sessions for now - implement actual session management later
      setSessions([
        {
          id: '1',
          device: 'Chrome on Windows',
          location: 'New York, USA',
          lastActive: new Date().toISOString(),
          isCurrent: true,
        },
      ]);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiClient.post('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleTwoFactor = async () => {
    setIsTogglingTwoFactor(true);
    setMessage(null);

    try {
      if (twoFactorEnabled) {
        await apiClient.post('/api/auth/disable-2fa', {});
        setTwoFactorEnabled(false);
        setMessage({ type: 'success', text: 'Two-factor authentication disabled' });
      } else {
        // In a real implementation, this would show a QR code and require verification
        await apiClient.post('/api/auth/enable-2fa', {});
        setTwoFactorEnabled(true);
        setMessage({ type: 'success', text: 'Two-factor authentication enabled' });
      }
    } catch (error: any) {
      console.error('Failed to toggle 2FA:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update 2FA settings' });
    } finally {
      setIsTogglingTwoFactor(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await apiClient.delete(`/api/auth/sessions/${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setMessage({ type: 'success', text: 'Session revoked successfully' });
    } catch (error: any) {
      console.error('Failed to revoke session:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to revoke session' });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Security</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account security settings
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

      {/* Change Password */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium mb-2">
              Current Password
            </label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
              }
              required
              minLength={8}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Must be at least 8 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
              }
              required
            />
          </div>

          <Button type="submit" disabled={isChangingPassword}>
            {isChangingPassword ? 'Changing Password...' : 'Change Password'}
          </Button>
        </form>
      </div>

      {/* Two-Factor Authentication */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <div className="font-medium">
              Two-Factor Authentication {twoFactorEnabled ? '(Enabled)' : '(Disabled)'}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Add an extra layer of security to your account
            </p>
          </div>
          <Button
            onClick={handleToggleTwoFactor}
            disabled={isTogglingTwoFactor}
            variant={twoFactorEnabled ? 'secondary' : 'primary'}
          >
            {isTogglingTwoFactor
              ? 'Processing...'
              : twoFactorEnabled
              ? 'Disable'
              : 'Enable'}
          </Button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Active Sessions</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage devices where you're currently logged in
        </p>

        {isLoadingSessions ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{session.device}</div>
                    {session.isCurrent && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {session.location} • Last active{' '}
                    {new Date(session.lastActive).toLocaleString()}
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="secondary"
                    onClick={() => handleRevokeSession(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
