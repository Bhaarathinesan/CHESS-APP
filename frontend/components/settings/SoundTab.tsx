'use client';

import React from 'react';
import { SoundSettings } from '@/components/ui/SoundSettings';

/**
 * Sound Tab Component
 * Requirements: 23.12-23.15
 * Wraps the existing SoundSettings component
 */

export function SoundTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Sound Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize sound effects and volume preferences
        </p>
      </div>

      <SoundSettings />
    </div>
  );
}
