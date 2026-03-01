/**
 * Time Control Configuration Types
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * Defines time control types, configurations, and validation for chess games.
 */

export type TimeControlCategory = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';

/**
 * Time control configuration with base time and increment
 */
export interface TimeControlConfig {
  /** Unique identifier for the time control */
  id: string;
  /** Display name */
  name: string;
  /** Category (bullet, blitz, rapid, classical, custom) */
  category: TimeControlCategory;
  /** Base time in minutes */
  baseTimeMinutes: number;
  /** Increment in seconds added after each move */
  incrementSeconds: number;
  /** Total time in milliseconds (baseTimeMinutes * 60 * 1000) */
  totalTimeMs: number;
  /** Whether this is a predefined time control */
  isPredefined: boolean;
  /** Short display format (e.g., "3+2") */
  displayFormat: string;
}

/**
 * Predefined time control presets
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export const BULLET_TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'bullet-1+0',
    name: 'Bullet 1+0',
    category: 'bullet',
    baseTimeMinutes: 1,
    incrementSeconds: 0,
    totalTimeMs: 60000,
    isPredefined: true,
    displayFormat: '1+0',
  },
  {
    id: 'bullet-1+1',
    name: 'Bullet 1+1',
    category: 'bullet',
    baseTimeMinutes: 1,
    incrementSeconds: 1,
    totalTimeMs: 60000,
    isPredefined: true,
    displayFormat: '1+1',
  },
  {
    id: 'bullet-2+1',
    name: 'Bullet 2+1',
    category: 'bullet',
    baseTimeMinutes: 2,
    incrementSeconds: 1,
    totalTimeMs: 120000,
    isPredefined: true,
    displayFormat: '2+1',
  },
];

export const BLITZ_TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'blitz-3+0',
    name: 'Blitz 3+0',
    category: 'blitz',
    baseTimeMinutes: 3,
    incrementSeconds: 0,
    totalTimeMs: 180000,
    isPredefined: true,
    displayFormat: '3+0',
  },
  {
    id: 'blitz-3+2',
    name: 'Blitz 3+2',
    category: 'blitz',
    baseTimeMinutes: 3,
    incrementSeconds: 2,
    totalTimeMs: 180000,
    isPredefined: true,
    displayFormat: '3+2',
  },
  {
    id: 'blitz-5+0',
    name: 'Blitz 5+0',
    category: 'blitz',
    baseTimeMinutes: 5,
    incrementSeconds: 0,
    totalTimeMs: 300000,
    isPredefined: true,
    displayFormat: '5+0',
  },
  {
    id: 'blitz-5+3',
    name: 'Blitz 5+3',
    category: 'blitz',
    baseTimeMinutes: 5,
    incrementSeconds: 3,
    totalTimeMs: 300000,
    isPredefined: true,
    displayFormat: '5+3',
  },
  {
    id: 'blitz-5+5',
    name: 'Blitz 5+5',
    category: 'blitz',
    baseTimeMinutes: 5,
    incrementSeconds: 5,
    totalTimeMs: 300000,
    isPredefined: true,
    displayFormat: '5+5',
  },
];

export const RAPID_TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'rapid-10+0',
    name: 'Rapid 10+0',
    category: 'rapid',
    baseTimeMinutes: 10,
    incrementSeconds: 0,
    totalTimeMs: 600000,
    isPredefined: true,
    displayFormat: '10+0',
  },
  {
    id: 'rapid-10+5',
    name: 'Rapid 10+5',
    category: 'rapid',
    baseTimeMinutes: 10,
    incrementSeconds: 5,
    totalTimeMs: 600000,
    isPredefined: true,
    displayFormat: '10+5',
  },
  {
    id: 'rapid-15+10',
    name: 'Rapid 15+10',
    category: 'rapid',
    baseTimeMinutes: 15,
    incrementSeconds: 10,
    totalTimeMs: 900000,
    isPredefined: true,
    displayFormat: '15+10',
  },
  {
    id: 'rapid-15+15',
    name: 'Rapid 15+15',
    category: 'rapid',
    baseTimeMinutes: 15,
    incrementSeconds: 15,
    totalTimeMs: 900000,
    isPredefined: true,
    displayFormat: '15+15',
  },
  {
    id: 'rapid-20+0',
    name: 'Rapid 20+0',
    category: 'rapid',
    baseTimeMinutes: 20,
    incrementSeconds: 0,
    totalTimeMs: 1200000,
    isPredefined: true,
    displayFormat: '20+0',
  },
];

export const CLASSICAL_TIME_CONTROLS: TimeControlConfig[] = [
  {
    id: 'classical-30+0',
    name: 'Classical 30+0',
    category: 'classical',
    baseTimeMinutes: 30,
    incrementSeconds: 0,
    totalTimeMs: 1800000,
    isPredefined: true,
    displayFormat: '30+0',
  },
  {
    id: 'classical-30+20',
    name: 'Classical 30+20',
    category: 'classical',
    baseTimeMinutes: 30,
    incrementSeconds: 20,
    totalTimeMs: 1800000,
    isPredefined: true,
    displayFormat: '30+20',
  },
  {
    id: 'classical-45+45',
    name: 'Classical 45+45',
    category: 'classical',
    baseTimeMinutes: 45,
    incrementSeconds: 45,
    totalTimeMs: 2700000,
    isPredefined: true,
    displayFormat: '45+45',
  },
  {
    id: 'classical-60+30',
    name: 'Classical 60+30',
    category: 'classical',
    baseTimeMinutes: 60,
    incrementSeconds: 30,
    totalTimeMs: 3600000,
    isPredefined: true,
    displayFormat: '60+30',
  },
  {
    id: 'classical-90+30',
    name: 'Classical 90+30',
    category: 'classical',
    baseTimeMinutes: 90,
    incrementSeconds: 30,
    totalTimeMs: 5400000,
    isPredefined: true,
    displayFormat: '90+30',
  },
];

/**
 * All predefined time controls
 */
export const ALL_TIME_CONTROLS: TimeControlConfig[] = [
  ...BULLET_TIME_CONTROLS,
  ...BLITZ_TIME_CONTROLS,
  ...RAPID_TIME_CONTROLS,
  ...CLASSICAL_TIME_CONTROLS,
];

/**
 * Time control validation constraints
 */
export const TIME_CONTROL_CONSTRAINTS = {
  MIN_BASE_TIME_MINUTES: 0.5, // 30 seconds minimum
  MAX_BASE_TIME_MINUTES: 180, // 3 hours maximum
  MIN_INCREMENT_SECONDS: 0,
  MAX_INCREMENT_SECONDS: 180, // 3 minutes maximum
} as const;

/**
 * Time control category boundaries (in minutes)
 */
export const TIME_CONTROL_BOUNDARIES = {
  BULLET_MAX: 3,
  BLITZ_MAX: 10,
  RAPID_MAX: 30,
} as const;
