/**
 * Hook for managing sound preferences
 * Requirements: 23.12-23.15
 */

import { useState, useEffect, useCallback } from 'react';
import { audioService } from '@/lib/audio-service';
import {
  SoundPreferences,
  SoundEffectType,
  DEFAULT_SOUND_PREFERENCES,
} from '@/types/sound-preferences';

const STORAGE_KEY = 'chess-sound-preferences';

export function useSoundPreferences() {
  const [preferences, setPreferences] = useState<SoundPreferences>(
    DEFAULT_SOUND_PREFERENCES
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Load from localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SoundPreferences;
          setPreferences(parsed);
          audioService.updatePreferences(parsed);
        }

        // Initialize audio service
        await audioService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load sound preferences:', error);
        setIsInitialized(true);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: SoundPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      audioService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save sound preferences:', error);
    }
  }, []);

  // Set master volume (0-100)
  const setVolume = useCallback(
    (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(100, volume));
      const newPreferences = { ...preferences, volume: clampedVolume };
      savePreferences(newPreferences);
    },
    [preferences, savePreferences]
  );

  // Toggle mute
  const setEnabled = useCallback(
    (enabled: boolean) => {
      const newPreferences = { ...preferences, enabled };
      savePreferences(newPreferences);
    },
    [preferences, savePreferences]
  );

  // Toggle individual sound effect
  const toggleEffect = useCallback(
    (type: SoundEffectType, enabled: boolean) => {
      const newPreferences = {
        ...preferences,
        effects: {
          ...preferences.effects,
          [type]: enabled,
        },
      };
      savePreferences(newPreferences);
    },
    [preferences, savePreferences]
  );

  // Play a sound effect
  const playSound = useCallback((type: SoundEffectType) => {
    audioService.play(type);
  }, []);

  // Start low time warning
  const startLowTimeWarning = useCallback(() => {
    audioService.startLowTimeWarning();
  }, []);

  // Stop low time warning
  const stopLowTimeWarning = useCallback(() => {
    audioService.stopLowTimeWarning();
  }, []);

  // Resume audio context (call on user interaction)
  const resumeAudio = useCallback(async () => {
    await audioService.resume();
  }, []);

  return {
    preferences,
    isInitialized,
    setVolume,
    setEnabled,
    toggleEffect,
    playSound,
    startLowTimeWarning,
    stopLowTimeWarning,
    resumeAudio,
  };
}
