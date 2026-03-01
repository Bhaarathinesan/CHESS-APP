'use client';

import { useState } from 'react';
import {
  TimeControlConfig,
  TimeControlCategory,
  BULLET_TIME_CONTROLS,
  BLITZ_TIME_CONTROLS,
  RAPID_TIME_CONTROLS,
  CLASSICAL_TIME_CONTROLS,
} from '@chess-arena/shared/types/time-control.types';
import {
  getOrCreateTimeControl,
  validateTimeControl,
  getCategoryDisplayName,
  getCategoryDescription,
} from '@chess-arena/shared/utils/time-control.utils';
import { Clock, Plus } from 'lucide-react';

export interface TimeControlSelectorProps {
  /** Currently selected time control */
  value?: TimeControlConfig;
  /** Callback when time control is selected */
  onChange: (timeControl: TimeControlConfig) => void;
  /** Whether to allow custom time controls */
  allowCustom?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * TimeControlSelector component for selecting chess time controls
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * Features:
 * - Predefined time controls for Bullet, Blitz, Rapid, Classical
 * - Custom time control creation
 * - Validation of time control settings
 * - Category-based organization
 */
export default function TimeControlSelector({
  value,
  onChange,
  allowCustom = true,
  className = '',
}: TimeControlSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<TimeControlCategory>('blitz');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customBaseTime, setCustomBaseTime] = useState('10');
  const [customIncrement, setCustomIncrement] = useState('0');
  const [customError, setCustomError] = useState<string>('');

  const categories: TimeControlCategory[] = ['bullet', 'blitz', 'rapid', 'classical'];

  const getTimeControlsForCategory = (category: TimeControlCategory): TimeControlConfig[] => {
    switch (category) {
      case 'bullet':
        return BULLET_TIME_CONTROLS;
      case 'blitz':
        return BLITZ_TIME_CONTROLS;
      case 'rapid':
        return RAPID_TIME_CONTROLS;
      case 'classical':
        return CLASSICAL_TIME_CONTROLS;
      default:
        return [];
    }
  };

  const handleTimeControlSelect = (timeControl: TimeControlConfig) => {
    onChange(timeControl);
    setShowCustomForm(false);
  };

  const handleCustomSubmit = () => {
    const baseTime = parseFloat(customBaseTime);
    const increment = parseInt(customIncrement, 10);

    // Validate
    const validation = validateTimeControl(baseTime, increment);
    if (!validation.isValid) {
      setCustomError(validation.errors[0]);
      return;
    }

    // Create custom time control
    const customTimeControl = getOrCreateTimeControl(baseTime, increment);
    onChange(customTimeControl);
    setShowCustomForm(false);
    setCustomError('');
  };

  return (
    <div className={`time-control-selector ${className}`} data-testid="time-control-selector">
      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setSelectedCategory(category);
              setShowCustomForm(false);
            }}
            className={`
              px-4 py-2 font-medium text-sm transition-colors
              border-b-2 -mb-px
              ${
                selectedCategory === category
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
            data-testid={`category-tab-${category}`}
          >
            {getCategoryDisplayName(category)}
          </button>
        ))}
        {allowCustom && (
          <button
            onClick={() => setShowCustomForm(true)}
            className={`
              px-4 py-2 font-medium text-sm transition-colors
              border-b-2 -mb-px flex items-center gap-1
              ${
                showCustomForm
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }
            `}
            data-testid="category-tab-custom"
          >
            <Plus className="w-4 h-4" />
            Custom
          </button>
        )}
      </div>

      {/* Category Description */}
      {!showCustomForm && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {getCategoryDescription(selectedCategory)}
        </p>
      )}

      {/* Time Control Options */}
      {!showCustomForm ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {getTimeControlsForCategory(selectedCategory).map((timeControl) => (
            <button
              key={timeControl.id}
              onClick={() => handleTimeControlSelect(timeControl)}
              className={`
                p-4 rounded-lg border-2 transition-all
                hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                ${
                  value?.id === timeControl.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }
              `}
              data-testid={`time-control-${timeControl.id}`}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-2xl font-bold">{timeControl.displayFormat}</span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {timeControl.baseTimeMinutes} min
                {timeControl.incrementSeconds > 0 && ` + ${timeControl.incrementSeconds}s`}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Custom Time Control Form */
        <div className="space-y-4" data-testid="custom-time-control-form">
          <div>
            <label className="block text-sm font-medium mb-2">
              Base Time (minutes)
            </label>
            <input
              type="number"
              min="0.5"
              max="180"
              step="0.5"
              value={customBaseTime}
              onChange={(e) => {
                setCustomBaseTime(e.target.value);
                setCustomError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              data-testid="custom-base-time-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Increment (seconds)
            </label>
            <input
              type="number"
              min="0"
              max="180"
              step="1"
              value={customIncrement}
              onChange={(e) => {
                setCustomIncrement(e.target.value);
                setCustomError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              data-testid="custom-increment-input"
            />
          </div>

          {customError && (
            <div
              className="text-sm text-red-600 dark:text-red-400"
              data-testid="custom-error-message"
            >
              {customError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCustomSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              data-testid="custom-submit-button"
            >
              Create Custom Time Control
            </button>
            <button
              onClick={() => {
                setShowCustomForm(false);
                setCustomError('');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              data-testid="custom-cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Selected Time Control Display */}
      {value && !showCustomForm && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Selected Time Control:
          </div>
          <div className="font-medium" data-testid="selected-time-control">
            {value.name} ({value.displayFormat})
          </div>
        </div>
      )}
    </div>
  );
}
