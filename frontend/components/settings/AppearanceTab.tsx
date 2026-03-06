'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { BOARD_THEMES, PIECE_SETS } from '@/types/chess-preferences';

/**
 * Appearance Tab Component
 * Requirements: 22.2-22.4, 22.16, 22.17
 * Allows users to customize theme, board theme, and piece set
 */

interface AppearanceSettings {
  theme: 'light' | 'dark';
  boardTheme: string;
  pieceSet: string;
}

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppearanceSettings>({
    theme: 'dark',
    boardTheme: 'default',
    pieceSet: 'default',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (theme) {
      setSettings((prev) => ({ ...prev, theme }));
    }
  }, [theme]);

  const loadSettings = async () => {
    try {
      const data = await apiClient.get<any>('/api/users/me');
      setSettings({
        theme: data.themePreference || 'dark',
        boardTheme: data.boardTheme || 'default',
        pieceSet: data.pieceSet || 'default',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    setSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  const handleBoardThemeChange = (boardTheme: string) => {
    setSettings((prev) => ({ ...prev, boardTheme }));
  };

  const handlePieceSetChange = (pieceSet: string) => {
    setSettings((prev) => ({ ...prev, pieceSet }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      await apiClient.patch('/api/users/me/settings', {
        theme: settings.theme,
        boardTheme: settings.boardTheme,
        pieceSet: settings.pieceSet,
      });

      setMessage({ type: 'success', text: 'Appearance settings saved successfully' });
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save settings' });
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Appearance</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize the look and feel of your chess experience
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

      {/* Theme Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Theme</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleThemeChange('light')}
            className={`p-4 border-2 rounded-lg transition-all ${
              settings.theme === 'light'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-white border border-gray-300 flex items-center justify-center">
                ☀️
              </div>
              <div className="text-left">
                <div className="font-medium">Light</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Bright and clean
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleThemeChange('dark')}
            className={`p-4 border-2 rounded-lg transition-all ${
              settings.theme === 'dark'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                🌙
              </div>
              <div className="text-left">
                <div className="font-medium">Dark</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Easy on the eyes
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Board Theme Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Board Theme</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {BOARD_THEMES.map((boardTheme) => (
            <button
              key={boardTheme.id}
              onClick={() => handleBoardThemeChange(boardTheme.id)}
              className={`p-4 border-2 rounded-lg transition-all ${
                settings.boardTheme === boardTheme.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="space-y-2">
                {/* Board Preview */}
                <div className="w-full aspect-square rounded overflow-hidden">
                  <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor:
                            (Math.floor(i / 4) + (i % 4)) % 2 === 0
                              ? boardTheme.lightSquare
                              : boardTheme.darkSquare,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-sm font-medium text-center">
                  {boardTheme.name}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Piece Set Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Piece Set</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PIECE_SETS.map((pieceSet) => (
            <button
              key={pieceSet.id}
              onClick={() => handlePieceSetChange(pieceSet.id)}
              className={`p-4 border-2 rounded-lg transition-all text-left ${
                settings.pieceSet === pieceSet.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <div className="font-medium">{pieceSet.name}</div>
              {pieceSet.description && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {pieceSet.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
