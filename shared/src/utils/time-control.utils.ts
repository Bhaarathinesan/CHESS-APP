/**
 * Time Control Utility Functions
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * Provides utilities for creating, validating, and managing time controls.
 */

import {
  TimeControlConfig,
  TimeControlCategory,
  ALL_TIME_CONTROLS,
  TIME_CONTROL_CONSTRAINTS,
  TIME_CONTROL_BOUNDARIES,
  BULLET_TIME_CONTROLS,
  BLITZ_TIME_CONTROLS,
  RAPID_TIME_CONTROLS,
  CLASSICAL_TIME_CONTROLS,
} from '../types/time-control.types';

/**
 * Get time control category based on base time
 * Requirement 5.1, 5.2, 5.3, 5.4
 */
export function getTimeControlCategory(baseTimeMinutes: number): TimeControlCategory {
  if (baseTimeMinutes <= TIME_CONTROL_BOUNDARIES.BULLET_MAX) {
    return 'bullet';
  }
  if (baseTimeMinutes <= TIME_CONTROL_BOUNDARIES.BLITZ_MAX) {
    return 'blitz';
  }
  if (baseTimeMinutes <= TIME_CONTROL_BOUNDARIES.RAPID_MAX) {
    return 'rapid';
  }
  return 'classical';
}

/**
 * Create a custom time control configuration
 * Requirement 5.5
 */
export function createCustomTimeControl(
  baseTimeMinutes: number,
  incrementSeconds: number,
  name?: string
): TimeControlConfig {
  const category = getTimeControlCategory(baseTimeMinutes);
  const displayFormat = `${baseTimeMinutes}+${incrementSeconds}`;
  const id = `custom-${displayFormat}-${Date.now()}`;

  return {
    id,
    name: name || `Custom ${displayFormat}`,
    category,
    baseTimeMinutes,
    incrementSeconds,
    totalTimeMs: baseTimeMinutes * 60 * 1000,
    isPredefined: false,
    displayFormat,
  };
}

/**
 * Validate time control configuration
 * Requirement 5.5
 */
export interface TimeControlValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateTimeControl(
  baseTimeMinutes: number,
  incrementSeconds: number
): TimeControlValidationResult {
  const errors: string[] = [];

  // Validate base time
  if (baseTimeMinutes < TIME_CONTROL_CONSTRAINTS.MIN_BASE_TIME_MINUTES) {
    errors.push(
      `Base time must be at least ${TIME_CONTROL_CONSTRAINTS.MIN_BASE_TIME_MINUTES} minutes`
    );
  }
  if (baseTimeMinutes > TIME_CONTROL_CONSTRAINTS.MAX_BASE_TIME_MINUTES) {
    errors.push(
      `Base time must not exceed ${TIME_CONTROL_CONSTRAINTS.MAX_BASE_TIME_MINUTES} minutes`
    );
  }

  // Validate increment
  if (incrementSeconds < TIME_CONTROL_CONSTRAINTS.MIN_INCREMENT_SECONDS) {
    errors.push(
      `Increment must be at least ${TIME_CONTROL_CONSTRAINTS.MIN_INCREMENT_SECONDS} seconds`
    );
  }
  if (incrementSeconds > TIME_CONTROL_CONSTRAINTS.MAX_INCREMENT_SECONDS) {
    errors.push(
      `Increment must not exceed ${TIME_CONTROL_CONSTRAINTS.MAX_INCREMENT_SECONDS} seconds`
    );
  }

  // Check for non-numeric values
  if (!Number.isFinite(baseTimeMinutes) || !Number.isFinite(incrementSeconds)) {
    errors.push('Base time and increment must be valid numbers');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Find a predefined time control by ID
 */
export function findTimeControlById(id: string): TimeControlConfig | undefined {
  return ALL_TIME_CONTROLS.find((tc) => tc.id === id);
}

/**
 * Find a predefined time control by base time and increment
 */
export function findTimeControlByConfig(
  baseTimeMinutes: number,
  incrementSeconds: number
): TimeControlConfig | undefined {
  return ALL_TIME_CONTROLS.find(
    (tc) =>
      tc.baseTimeMinutes === baseTimeMinutes &&
      tc.incrementSeconds === incrementSeconds
  );
}

/**
 * Get all time controls for a specific category
 */
export function getTimeControlsByCategory(
  category: TimeControlCategory
): TimeControlConfig[] {
  switch (category) {
    case 'bullet':
      return BULLET_TIME_CONTROLS;
    case 'blitz':
      return BLITZ_TIME_CONTROLS;
    case 'rapid':
      return RAPID_TIME_CONTROLS;
    case 'classical':
      return CLASSICAL_TIME_CONTROLS;
    case 'custom':
      return [];
    default:
      return [];
  }
}

/**
 * Format time control for display
 */
export function formatTimeControl(config: TimeControlConfig): string {
  return config.displayFormat;
}

/**
 * Parse time control from display format (e.g., "5+3")
 */
export function parseTimeControlFormat(
  format: string
): { baseTimeMinutes: number; incrementSeconds: number } | null {
  const match = format.match(/^(\d+(?:\.\d+)?)\+(\d+)$/);
  if (!match) {
    return null;
  }

  const baseTimeMinutes = parseFloat(match[1]);
  const incrementSeconds = parseInt(match[2], 10);

  if (!Number.isFinite(baseTimeMinutes) || !Number.isFinite(incrementSeconds)) {
    return null;
  }

  return { baseTimeMinutes, incrementSeconds };
}

/**
 * Get time control configuration from base time and increment
 * Returns predefined config if exists, otherwise creates custom
 */
export function getOrCreateTimeControl(
  baseTimeMinutes: number,
  incrementSeconds: number,
  name?: string
): TimeControlConfig {
  // Try to find predefined time control
  const predefined = findTimeControlByConfig(baseTimeMinutes, incrementSeconds);
  if (predefined) {
    return predefined;
  }

  // Create custom time control
  return createCustomTimeControl(baseTimeMinutes, incrementSeconds, name);
}

/**
 * Convert time control to milliseconds
 */
export function timeControlToMs(baseTimeMinutes: number): number {
  return baseTimeMinutes * 60 * 1000;
}

/**
 * Convert milliseconds to minutes
 */
export function msToMinutes(ms: number): number {
  return ms / 60 / 1000;
}

/**
 * Check if a time control is predefined
 */
export function isPredefinedTimeControl(
  baseTimeMinutes: number,
  incrementSeconds: number
): boolean {
  return findTimeControlByConfig(baseTimeMinutes, incrementSeconds) !== undefined;
}

/**
 * Get display name for time control category
 */
export function getCategoryDisplayName(category: TimeControlCategory): string {
  const names: Record<TimeControlCategory, string> = {
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    custom: 'Custom',
  };
  return names[category];
}

/**
 * Get description for time control category
 */
export function getCategoryDescription(category: TimeControlCategory): string {
  const descriptions: Record<TimeControlCategory, string> = {
    bullet: 'Fast-paced games under 3 minutes',
    blitz: 'Quick games between 3-10 minutes',
    rapid: 'Moderate games between 10-30 minutes',
    classical: 'Long games over 30 minutes',
    custom: 'Custom time control settings',
  };
  return descriptions[category];
}
