'use client';

import { useState, useEffect } from 'react';
import { ChessPreferences } from '@/types/chess-preferences';

const STORAGE_KEY = 'chess-preferences';

const DEFAULT_PREFERENCES: ChessPreferences = {
  boardTheme: 'default',
  pieceSet: 'default',
};

/**
 * Hook for managing chess board and piece preferences
 * Persists preferences to localStorage
 * Requirements: 22.16, 22.17
 */
export function useChessPreferences() {
  const [preferences, setPreferences] = useState<ChessPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({
          boardTheme: parsed.boardTheme || DEFAULT_PREFERENCES.boardTheme,
          pieceSet: parsed.pieceSet || DEFAULT_PREFERENCES.pieceSet,
        });
      }
    } catch (error) {
      console.error('Failed to load chess preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      } catch (error) {
        console.error('Failed to save chess preferences:', error);
      }
    }
  }, [preferences, isLoaded]);

  const setBoardTheme = (theme: string) => {
    setPreferences((prev) => ({ ...prev, boardTheme: theme }));
  };

  const setPieceSet = (pieceSet: string) => {
    setPreferences((prev) => ({ ...prev, pieceSet }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  return {
    preferences,
    setBoardTheme,
    setPieceSet,
    resetPreferences,
    isLoaded,
  };
}
