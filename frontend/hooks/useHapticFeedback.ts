'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChessPreferences } from './useChessPreferences';

/**
 * Haptic feedback patterns for different chess events
 * Values are in milliseconds for vibration duration
 * Arrays represent patterns: [vibrate, pause, vibrate, pause, ...]
 */
export const HAPTIC_PATTERNS = {
  // Light haptic for regular moves (Requirement 21.4)
  MOVE: 15,
  
  // Medium haptic for captures (Requirement 21.4)
  CAPTURE: 40,
  
  // Strong pattern for check (Requirement 21.4)
  CHECK: [50, 30, 50],
  
  // Strong pattern for checkmate (Requirement 21.4)
  CHECKMATE: [100, 50, 100, 50, 100],
  
  // Medium haptic for castling
  CASTLING: 30,
  
  // Light haptic for piece selection
  SELECT: 10,
  
  // Light haptic for UI interactions
  UI_INTERACTION: 10,
} as const;

export type HapticPattern = keyof typeof HAPTIC_PATTERNS;

/**
 * Hook for providing haptic feedback on supported devices
 * 
 * Features:
 * - Uses Vibration API for browser support
 * - Gracefully degrades on unsupported devices
 * - Respects user preferences for haptic feedback
 * - Different vibration patterns for different events
 * 
 * Requirements:
 * - 21.4: Haptic feedback on piece moves, captures, and check
 */
export function useHapticFeedback() {
  const [isSupported, setIsSupported] = useState(false);
  const { preferences, updatePreferences } = useChessPreferences();

  // Check if Vibration API is supported
  useEffect(() => {
    const supported = 'vibrate' in navigator;
    setIsSupported(supported);
  }, []);

  /**
   * Trigger haptic feedback with the specified pattern
   * @param pattern - The haptic pattern to use
   */
  const triggerHaptic = useCallback(
    (pattern: HapticPattern) => {
      // Check if haptic feedback is enabled in preferences
      if (!preferences.hapticEnabled) {
        return;
      }

      // Check if Vibration API is supported
      if (!isSupported || !navigator.vibrate) {
        return;
      }

      try {
        const vibrationPattern = HAPTIC_PATTERNS[pattern];
        navigator.vibrate(vibrationPattern);
      } catch (error) {
        // Silently fail if vibration fails
        console.debug('Haptic feedback failed:', error);
      }
    },
    [isSupported, preferences.hapticEnabled]
  );

  /**
   * Enable or disable haptic feedback
   * @param enabled - Whether haptic feedback should be enabled
   */
  const setHapticEnabled = useCallback(
    (enabled: boolean) => {
      updatePreferences({ hapticEnabled: enabled });
    },
    [updatePreferences]
  );

  return {
    triggerHaptic,
    isSupported,
    isEnabled: preferences.hapticEnabled,
    setHapticEnabled,
  };
}
