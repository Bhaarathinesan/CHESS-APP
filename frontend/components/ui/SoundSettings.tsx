/**
 * SoundSettings Component - Sound preferences UI
 * Requirements: 23.12-23.15
 */

'use client';

import React from 'react';
import { useSoundPreferences } from '@/hooks/useSoundPreferences';
import {
  SoundEffectType,
  SOUND_EFFECT_LABELS,
} from '@/types/sound-preferences';

export function SoundSettings() {
  const {
    preferences,
    isInitialized,
    setVolume,
    setEnabled,
    toggleEffect,
    playSound,
  } = useSoundPreferences();

  if (!isInitialized) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading sound settings...
      </div>
    );
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
  };

  const handleMuteToggle = () => {
    setEnabled(!preferences.enabled);
  };

  const handleEffectToggle = (type: SoundEffectType) => {
    const newValue = !preferences.effects[type];
    toggleEffect(type, newValue);
    
    // Play the sound as a preview if enabling
    if (newValue && preferences.enabled) {
      playSound(type);
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Master Controls</h3>

        {/* Mute Toggle */}
        <div className="flex items-center justify-between">
          <label htmlFor="sound-enabled" className="text-sm font-medium">
            Enable Sounds
          </label>
          <button
            id="sound-enabled"
            onClick={handleMuteToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            aria-label={preferences.enabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Volume Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="volume-slider" className="text-sm font-medium">
              Master Volume
            </label>
            <span className="text-sm text-gray-600">{preferences.volume}%</span>
          </div>
          <input
            id="volume-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={preferences.volume}
            onChange={handleVolumeChange}
            disabled={!preferences.enabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: preferences.enabled
                ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${preferences.volume}%, #e5e7eb ${preferences.volume}%, #e5e7eb 100%)`
                : undefined,
            }}
          />
        </div>
      </div>

      {/* Individual Sound Effects */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sound Effects</h3>
        <div className="space-y-3">
          {(Object.keys(SOUND_EFFECT_LABELS) as SoundEffectType[]).map(
            (type) => (
              <div
                key={type}
                className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
              >
                <label
                  htmlFor={`effect-${type}`}
                  className="text-sm cursor-pointer"
                >
                  {SOUND_EFFECT_LABELS[type]}
                </label>
                <button
                  id={`effect-${type}`}
                  onClick={() => handleEffectToggle(type)}
                  disabled={!preferences.enabled}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    preferences.effects[type] && preferences.enabled
                      ? 'bg-blue-600'
                      : 'bg-gray-300'
                  }`}
                  aria-label={`Toggle ${SOUND_EFFECT_LABELS[type]} sound`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      preferences.effects[type] && preferences.enabled
                        ? 'translate-x-5'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
        Sound preferences are saved automatically and persist across sessions.
      </div>
    </div>
  );
}
