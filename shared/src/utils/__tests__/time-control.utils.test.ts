/**
 * Unit tests for time control utilities
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import {
  getTimeControlCategory,
  createCustomTimeControl,
  validateTimeControl,
  findTimeControlById,
  findTimeControlByConfig,
  getTimeControlsByCategory,
  formatTimeControl,
  parseTimeControlFormat,
  getOrCreateTimeControl,
  timeControlToMs,
  msToMinutes,
  isPredefinedTimeControl,
  getCategoryDisplayName,
  getCategoryDescription,
} from '../time-control.utils';
import {
  BULLET_TIME_CONTROLS,
  BLITZ_TIME_CONTROLS,
  RAPID_TIME_CONTROLS,
  CLASSICAL_TIME_CONTROLS,
} from '../../types/time-control.types';

describe('Time Control Utils', () => {
  describe('getTimeControlCategory', () => {
    it('should categorize bullet time controls (≤3 minutes)', () => {
      expect(getTimeControlCategory(1)).toBe('bullet');
      expect(getTimeControlCategory(2)).toBe('bullet');
      expect(getTimeControlCategory(3)).toBe('bullet');
    });

    it('should categorize blitz time controls (3-10 minutes)', () => {
      expect(getTimeControlCategory(3.5)).toBe('blitz');
      expect(getTimeControlCategory(5)).toBe('blitz');
      expect(getTimeControlCategory(10)).toBe('blitz');
    });

    it('should categorize rapid time controls (10-30 minutes)', () => {
      expect(getTimeControlCategory(10.5)).toBe('rapid');
      expect(getTimeControlCategory(15)).toBe('rapid');
      expect(getTimeControlCategory(30)).toBe('rapid');
    });

    it('should categorize classical time controls (>30 minutes)', () => {
      expect(getTimeControlCategory(30.5)).toBe('classical');
      expect(getTimeControlCategory(45)).toBe('classical');
      expect(getTimeControlCategory(90)).toBe('classical');
    });
  });

  describe('createCustomTimeControl', () => {
    it('should create custom time control with correct properties', () => {
      const tc = createCustomTimeControl(7, 5);
      
      expect(tc.baseTimeMinutes).toBe(7);
      expect(tc.incrementSeconds).toBe(5);
      expect(tc.category).toBe('blitz');
      expect(tc.displayFormat).toBe('7+5');
      expect(tc.isPredefined).toBe(false);
      expect(tc.totalTimeMs).toBe(420000); // 7 * 60 * 1000
    });

    it('should use custom name if provided', () => {
      const tc = createCustomTimeControl(10, 0, 'My Custom Game');
      expect(tc.name).toBe('My Custom Game');
    });

    it('should generate default name if not provided', () => {
      const tc = createCustomTimeControl(10, 0);
      expect(tc.name).toBe('Custom 10+0');
    });

    it('should generate unique IDs for different custom time controls', () => {
      const tc1 = createCustomTimeControl(5, 3);
      const tc2 = createCustomTimeControl(5, 3);
      
      expect(tc1.id).not.toBe(tc2.id);
    });
  });

  describe('validateTimeControl', () => {
    it('should validate correct time controls', () => {
      const result = validateTimeControl(5, 3);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject base time below minimum', () => {
      const result = validateTimeControl(0.25, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base time must be at least 0.5 minutes');
    });

    it('should reject base time above maximum', () => {
      const result = validateTimeControl(200, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base time must not exceed 180 minutes');
    });

    it('should reject increment below minimum', () => {
      const result = validateTimeControl(5, -1);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Increment must be at least 0 seconds');
    });

    it('should reject increment above maximum', () => {
      const result = validateTimeControl(5, 200);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Increment must not exceed 180 seconds');
    });

    it('should reject non-numeric values', () => {
      const result = validateTimeControl(NaN, 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Base time and increment must be valid numbers');
    });

    it('should accept minimum valid values', () => {
      const result = validateTimeControl(0.5, 0);
      expect(result.isValid).toBe(true);
    });

    it('should accept maximum valid values', () => {
      const result = validateTimeControl(180, 180);
      expect(result.isValid).toBe(true);
    });
  });

  describe('findTimeControlById', () => {
    it('should find bullet time control by ID', () => {
      const tc = findTimeControlById('bullet-1+0');
      expect(tc).toBeDefined();
      expect(tc?.baseTimeMinutes).toBe(1);
      expect(tc?.incrementSeconds).toBe(0);
    });

    it('should find blitz time control by ID', () => {
      const tc = findTimeControlById('blitz-5+3');
      expect(tc).toBeDefined();
      expect(tc?.baseTimeMinutes).toBe(5);
      expect(tc?.incrementSeconds).toBe(3);
    });

    it('should return undefined for non-existent ID', () => {
      const tc = findTimeControlById('non-existent');
      expect(tc).toBeUndefined();
    });
  });

  describe('findTimeControlByConfig', () => {
    it('should find predefined time control by config', () => {
      const tc = findTimeControlByConfig(5, 3);
      expect(tc).toBeDefined();
      expect(tc?.id).toBe('blitz-5+3');
    });

    it('should return undefined for non-predefined config', () => {
      const tc = findTimeControlByConfig(7, 4);
      expect(tc).toBeUndefined();
    });
  });

  describe('getTimeControlsByCategory', () => {
    it('should return bullet time controls', () => {
      const controls = getTimeControlsByCategory('bullet');
      expect(controls).toEqual(BULLET_TIME_CONTROLS);
      expect(controls).toHaveLength(3);
    });

    it('should return blitz time controls', () => {
      const controls = getTimeControlsByCategory('blitz');
      expect(controls).toEqual(BLITZ_TIME_CONTROLS);
      expect(controls).toHaveLength(5);
    });

    it('should return rapid time controls', () => {
      const controls = getTimeControlsByCategory('rapid');
      expect(controls).toEqual(RAPID_TIME_CONTROLS);
      expect(controls).toHaveLength(5);
    });

    it('should return classical time controls', () => {
      const controls = getTimeControlsByCategory('classical');
      expect(controls).toEqual(CLASSICAL_TIME_CONTROLS);
      expect(controls).toHaveLength(5);
    });

    it('should return empty array for custom category', () => {
      const controls = getTimeControlsByCategory('custom');
      expect(controls).toEqual([]);
    });
  });

  describe('formatTimeControl', () => {
    it('should format time control correctly', () => {
      const tc = findTimeControlById('blitz-5+3')!;
      expect(formatTimeControl(tc)).toBe('5+3');
    });
  });

  describe('parseTimeControlFormat', () => {
    it('should parse valid format', () => {
      const result = parseTimeControlFormat('5+3');
      expect(result).toEqual({
        baseTimeMinutes: 5,
        incrementSeconds: 3,
      });
    });

    it('should parse format with decimal minutes', () => {
      const result = parseTimeControlFormat('2.5+1');
      expect(result).toEqual({
        baseTimeMinutes: 2.5,
        incrementSeconds: 1,
      });
    });

    it('should return null for invalid format', () => {
      expect(parseTimeControlFormat('5-3')).toBeNull();
      expect(parseTimeControlFormat('5')).toBeNull();
      expect(parseTimeControlFormat('abc')).toBeNull();
      expect(parseTimeControlFormat('')).toBeNull();
    });
  });

  describe('getOrCreateTimeControl', () => {
    it('should return predefined time control if exists', () => {
      const tc = getOrCreateTimeControl(5, 3);
      expect(tc.id).toBe('blitz-5+3');
      expect(tc.isPredefined).toBe(true);
    });

    it('should create custom time control if not predefined', () => {
      const tc = getOrCreateTimeControl(7, 4);
      expect(tc.isPredefined).toBe(false);
      expect(tc.baseTimeMinutes).toBe(7);
      expect(tc.incrementSeconds).toBe(4);
    });

    it('should use custom name when creating new time control', () => {
      const tc = getOrCreateTimeControl(7, 4, 'Special Game');
      expect(tc.name).toBe('Special Game');
    });
  });

  describe('timeControlToMs', () => {
    it('should convert minutes to milliseconds', () => {
      expect(timeControlToMs(1)).toBe(60000);
      expect(timeControlToMs(5)).toBe(300000);
      expect(timeControlToMs(10)).toBe(600000);
    });

    it('should handle decimal minutes', () => {
      expect(timeControlToMs(0.5)).toBe(30000);
      expect(timeControlToMs(2.5)).toBe(150000);
    });
  });

  describe('msToMinutes', () => {
    it('should convert milliseconds to minutes', () => {
      expect(msToMinutes(60000)).toBe(1);
      expect(msToMinutes(300000)).toBe(5);
      expect(msToMinutes(600000)).toBe(10);
    });

    it('should handle partial minutes', () => {
      expect(msToMinutes(30000)).toBe(0.5);
      expect(msToMinutes(150000)).toBe(2.5);
    });
  });

  describe('isPredefinedTimeControl', () => {
    it('should return true for predefined time controls', () => {
      expect(isPredefinedTimeControl(1, 0)).toBe(true);
      expect(isPredefinedTimeControl(5, 3)).toBe(true);
      expect(isPredefinedTimeControl(15, 10)).toBe(true);
    });

    it('should return false for custom time controls', () => {
      expect(isPredefinedTimeControl(7, 4)).toBe(false);
      expect(isPredefinedTimeControl(12, 8)).toBe(false);
    });
  });

  describe('getCategoryDisplayName', () => {
    it('should return correct display names', () => {
      expect(getCategoryDisplayName('bullet')).toBe('Bullet');
      expect(getCategoryDisplayName('blitz')).toBe('Blitz');
      expect(getCategoryDisplayName('rapid')).toBe('Rapid');
      expect(getCategoryDisplayName('classical')).toBe('Classical');
      expect(getCategoryDisplayName('custom')).toBe('Custom');
    });
  });

  describe('getCategoryDescription', () => {
    it('should return correct descriptions', () => {
      expect(getCategoryDescription('bullet')).toContain('under 3 minutes');
      expect(getCategoryDescription('blitz')).toContain('3-10 minutes');
      expect(getCategoryDescription('rapid')).toContain('10-30 minutes');
      expect(getCategoryDescription('classical')).toContain('over 30 minutes');
      expect(getCategoryDescription('custom')).toContain('Custom');
    });
  });

  describe('Predefined Time Controls - Requirements Validation', () => {
    it('should have all required bullet time controls (Requirement 5.1)', () => {
      expect(findTimeControlByConfig(1, 0)).toBeDefined();
      expect(findTimeControlByConfig(1, 1)).toBeDefined();
      expect(findTimeControlByConfig(2, 1)).toBeDefined();
    });

    it('should have all required blitz time controls (Requirement 5.2)', () => {
      expect(findTimeControlByConfig(3, 0)).toBeDefined();
      expect(findTimeControlByConfig(3, 2)).toBeDefined();
      expect(findTimeControlByConfig(5, 0)).toBeDefined();
      expect(findTimeControlByConfig(5, 3)).toBeDefined();
      expect(findTimeControlByConfig(5, 5)).toBeDefined();
    });

    it('should have all required rapid time controls (Requirement 5.3)', () => {
      expect(findTimeControlByConfig(10, 0)).toBeDefined();
      expect(findTimeControlByConfig(10, 5)).toBeDefined();
      expect(findTimeControlByConfig(15, 10)).toBeDefined();
      expect(findTimeControlByConfig(15, 15)).toBeDefined();
      expect(findTimeControlByConfig(20, 0)).toBeDefined();
    });

    it('should have all required classical time controls (Requirement 5.4)', () => {
      expect(findTimeControlByConfig(30, 0)).toBeDefined();
      expect(findTimeControlByConfig(30, 20)).toBeDefined();
      expect(findTimeControlByConfig(45, 45)).toBeDefined();
      expect(findTimeControlByConfig(60, 30)).toBeDefined();
      expect(findTimeControlByConfig(90, 30)).toBeDefined();
    });

    it('should support custom time controls (Requirement 5.5)', () => {
      const custom = createCustomTimeControl(12, 8);
      expect(custom).toBeDefined();
      expect(custom.isPredefined).toBe(false);
      expect(custom.baseTimeMinutes).toBe(12);
      expect(custom.incrementSeconds).toBe(8);
    });
  });
});
