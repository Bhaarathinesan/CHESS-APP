import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useHapticFeedback, HAPTIC_PATTERNS } from '../useHapticFeedback';

// Mock the useChessPreferences hook
vi.mock('../useChessPreferences', () => ({
  useChessPreferences: () => ({
    preferences: { hapticEnabled: true },
    updatePreferences: vi.fn(),
  }),
}));

describe('useHapticFeedback', () => {
  let mockVibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock the Vibration API
    mockVibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      configurable: true,
      value: mockVibrate,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Vibration API support detection', () => {
    it('should detect when Vibration API is supported', () => {
      const { result } = renderHook(() => useHapticFeedback());
      
      expect(result.current.isSupported).toBe(true);
    });

    it('should detect when Vibration API is not supported', () => {
      // Remove vibrate from navigator
      const originalVibrate = navigator.vibrate;
      // @ts-ignore
      delete navigator.vibrate;

      const { result } = renderHook(() => useHapticFeedback());
      
      expect(result.current.isSupported).toBe(false);

      // Restore
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        configurable: true,
        value: originalVibrate,
      });
    });
  });

  describe('Haptic feedback triggering', () => {
    it('should trigger haptic feedback for MOVE pattern', () => {
      const { result } = renderHook(() => useHapticFeedback());

      act(() => {
        result.current.triggerHaptic('MOVE');
      });

      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.MOVE);
    });

    it('should trigger haptic feedback for CAPTURE pattern', () => {
      const { result } = renderHook(() => useHapticFeedback());

      act(() => {
        result.current.triggerHaptic('CAPTURE');
      });

      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.CAPTURE);
    });

    it('should trigger haptic feedback for CHECK pattern', () => {
      const { result } = renderHook(() => useHapticFeedback());

      act(() => {
        result.current.triggerHaptic('CHECK');
      });

      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.CHECK);
    });

    it('should trigger haptic feedback for CHECKMATE pattern', () => {
      const { result } = renderHook(() => useHapticFeedback());

      act(() => {
        result.current.triggerHaptic('CHECKMATE');
      });

      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.CHECKMATE);
    });

    it('should trigger haptic feedback for CASTLING pattern', () => {
      const { result } = renderHook(() => useHapticFeedback());

      act(() => {
        result.current.triggerHaptic('CASTLING');
      });

      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.CASTLING);
    });

    it('should trigger haptic feedback for SELECT pattern', () => {
      const { result } = renderHook(() => useHapticFeedback());

      act(() => {
        result.current.triggerHaptic('SELECT');
      });

      expect(mockVibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.SELECT);
    });
  });

  describe('Haptic patterns', () => {
    it('should use correct duration for MOVE (light haptic)', () => {
      expect(HAPTIC_PATTERNS.MOVE).toBe(15);
    });

    it('should use correct duration for CAPTURE (medium haptic)', () => {
      expect(HAPTIC_PATTERNS.CAPTURE).toBe(40);
    });

    it('should use correct pattern for CHECK (strong pattern)', () => {
      expect(HAPTIC_PATTERNS.CHECK).toEqual([50, 30, 50]);
    });

    it('should use correct pattern for CHECKMATE (strong pattern)', () => {
      expect(HAPTIC_PATTERNS.CHECKMATE).toEqual([100, 50, 100, 50, 100]);
    });

    it('should use correct duration for CASTLING (medium haptic)', () => {
      expect(HAPTIC_PATTERNS.CASTLING).toBe(30);
    });

    it('should use correct duration for SELECT (light haptic)', () => {
      expect(HAPTIC_PATTERNS.SELECT).toBe(10);
    });
  });

  describe('Error handling', () => {
    it('should handle vibration errors gracefully', () => {
      // Mock vibrate to throw an error
      mockVibrate.mockImplementation(() => {
        throw new Error('Vibration failed');
      });

      const { result } = renderHook(() => useHapticFeedback());

      // Should not throw
      expect(() => {
        act(() => {
          result.current.triggerHaptic('MOVE');
        });
      }).not.toThrow();
    });
  });

  describe('Enable/disable functionality', () => {
    it('should provide setHapticEnabled function', () => {
      const { result } = renderHook(() => useHapticFeedback());

      expect(typeof result.current.setHapticEnabled).toBe('function');
    });

    it('should reflect enabled state from preferences', () => {
      const { result } = renderHook(() => useHapticFeedback());

      expect(result.current.isEnabled).toBe(true);
    });
  });
});
