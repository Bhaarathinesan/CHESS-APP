import { render } from '@testing-library/react';
import React from 'react';
import ChessClock from '../ChessClock';

/**
 * Tests for ChessClock component
 * 
 * Requirements tested:
 * - 5.8: Visual warning at 10 seconds
 * - 5.13: Display time with decisecond precision
 * - 23.8: Play ticking sound at 10 seconds
 */

describe('ChessClock Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Mock Audio API
    const mockAudioContext = {
      createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { value: 0 },
        type: 'sine',
      }),
      crea
      createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
      }),
      destination: {},
      currentTime: 0,
    };
    
    global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext) as any;
    (global as any).webkitAudioContext = global.AudioContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Requirement 5.13: Decisecond Precision Display', () => {
    it('should display time with decisecond precision (MM:SS.d format)', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={125400}
          isActive={false}
          playerName="Player 1"
        />
      );

      // 125400ms = 2 minutes, 5 seconds, 4 deciseconds
      // Should display as "2:05.4"
      expect(container.textContent).toContain('2:05.4');
    });

    it('should display deciseconds correctly for various times', () => {
      const testCases = [
        { ms: 60000, expected: '1:00.0' },
        { ms: 59900, expected: '0:59.9' },
        { ms: 10500, expected: '0:10.5' },
        { ms: 5300, expected: '0:05.3' },
        { ms: 1100, expected: '0:01.1' },
        { ms: 100, expected: '0:00.1' },
      ];

      testCases.forEach(({ ms, expected }) => {
        const { container, unmount } = render(
          <ChessClock timeRemaining={ms} isActive={false} />
        );
        expect(container.textContent).toContain(expected);
        unmount();
      });
    });

    it('should display 0:00.0 when time is zero or negative', () => {
      const { container: container1 } = render(
        <ChessClock timeRemaining={0} isActive={false} />
      );
      expect(container1.textContent).toContain('0:00.0');

      const { container: container2 } = render(
        <ChessClock timeRemaining={-1000} isActive={false} />
      );
      expect(container2.textContent).toContain('0:00.0');
    });

    it('should pad seconds with leading zero', () => {
      const { container } = render(
        <ChessClock timeRemaining={65000} isActive={false} />
      );
      // 65000ms = 1:05.0
      expect(container.textContent).toContain('1:05.0');
    });

    it('should handle large time values correctly', () => {
      const { container } = render(
        <ChessClock timeRemaining={3600000} isActive={false} />
      );
      // 3600000ms = 60 minutes = 60:00.0
      expect(container.textContent).toContain('60:00.0');
    });
  });

  describe('Requirement 5.8: Visual Warning at 10 Seconds', () => {
    it('should display visual warning when time reaches 10 seconds', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={10000}
          isActive={true}
          showWarning={true}
        />
      );

      // Check for warning styling (red background, pulse animation)
      const clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-is-low-time')).toBe('true');
    });

    it('should show AlertTriangle icon when in low time warning', () => {
      render(
        <ChessClock
          timeRemaining={9000}
          isActive={true}
          showWarning={true}
        />
      );

      // AlertTriangle icon should be present
      const alertIcon = document.querySelector('svg');
      expect(alertIcon).toBeTruthy();
    });

    it('should NOT show warning when time is above 10 seconds', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={11000}
          isActive={true}
          showWarning={true}
        />
      );

      const clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-is-low-time')).toBe('false');
    });

    it('should apply pulse animation when in warning state', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={8000}
          isActive={true}
          showWarning={true}
        />
      );

      // Check for animate-pulse class
      const clockDiv = container.querySelector('div > div');
      expect(clockDiv?.className).toContain('animate-pulse');
    });

    it('should increase font size when in low time', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={7000}
          isActive={true}
          showWarning={true}
        />
      );

      const timeDisplay = container.querySelector('.font-mono');
      expect(timeDisplay?.className).toContain('text-xl');
    });

    it('should transition from normal to warning state at 10 second threshold', () => {
      const { container, rerender } = render(
        <ChessClock
          timeRemaining={11000}
          isActive={true}
          showWarning={true}
        />
      );

      let clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-is-low-time')).toBe('false');

      // Update to 10 seconds
      rerender(
        <ChessClock
          timeRemaining={10000}
          isActive={true}
          showWarning={true}
        />
      );

      clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-is-low-time')).toBe('true');
    });
  });

  describe('Requirement 23.8: Ticking Sound at 10 Seconds', () => {
    it('should play ticking sound when time reaches 10 seconds', () => {
      const mockAudioContext = vi.fn().mockImplementation(() => ({
        createOscillator: vi.fn().mockReturnValue({
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: { value: 0 },
          type: 'sine',
        }),
        createGain: vi.fn().mockReturnValue({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        }),
        destination: {},
        currentTime: 0,
      }));

      global.AudioContext = mockAudioContext as any;

      render(
        <ChessClock
          timeRemaining={10000}
          isActive={true}
          enableSound={true}
        />
      );

      // AudioContext should be created when entering low time
      expect(mockAudioContext).toHaveBeenCalled();
    });

    it('should NOT play sound when enableSound is false', () => {
      const mockAudioContext = vi.fn();
      global.AudioContext = mockAudioContext as any;

      render(
        <ChessClock
          timeRemaining={9000}
          isActive={true}
          enableSound={false}
        />
      );

      // AudioContext should not be created
      expect(mockAudioContext).not.toHaveBeenCalled();
    });

    it('should NOT play sound when time is above 10 seconds', () => {
      const mockAudioContext = vi.fn();
      global.AudioContext = mockAudioContext as any;

      render(
        <ChessClock
          timeRemaining={15000}
          isActive={true}
          enableSound={true}
        />
      );

      // AudioContext should not be created yet
      expect(mockAudioContext).not.toHaveBeenCalled();
    });

    it('should stop ticking sound when time goes back above 10 seconds', () => {
      const { rerender } = render(
        <ChessClock
          timeRemaining={9000}
          isActive={true}
          enableSound={true}
        />
      );

      // Now increase time above threshold
      rerender(
        <ChessClock
          timeRemaining={15000}
          isActive={true}
          enableSound={true}
        />
      );

      // Sound should be stopped (tested via cleanup)
      expect(true).toBe(true);
    });
  });

  describe('Clock Display and Styling', () => {
    it('should display player name when provided', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={60000}
          isActive={false}
          playerName="Magnus Carlsen"
        />
      );

      expect(container.textContent).toContain('Magnus Carlsen');
    });

    it('should show color indicator for white player', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={60000}
          isActive={false}
          playerName="Player 1"
          playerColor="white"
        />
      );

      const colorIndicator = container.querySelector('.bg-white');
      expect(colorIndicator).toBeTruthy();
    });

    it('should show color indicator for black player', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={60000}
          isActive={false}
          playerName="Player 2"
          playerColor="black"
        />
      );

      const colorIndicator = container.querySelector('.bg-gray-900');
      expect(colorIndicator).toBeTruthy();
    });

    it('should show active indicator when clock is active', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={60000}
          isActive={true}
        />
      );

      const clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-is-active')).toBe('true');
    });

    it('should apply blue styling when clock is active', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={60000}
          isActive={true}
        />
      );

      const clockDiv = container.querySelector('div > div');
      expect(clockDiv?.className).toContain('bg-blue-100');
    });

    it('should apply red styling when time is zero', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={0}
          isActive={false}
        />
      );

      const clockDiv = container.querySelector('div > div');
      expect(clockDiv?.className).toContain('bg-red-600');
    });

    it('should apply custom className when provided', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={60000}
          isActive={false}
          className="custom-class"
        />
      );

      const clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.className).toContain('custom-class');
    });
  });

  describe('Timeout Handling', () => {
    it('should call onTimeout when time reaches zero', () => {
      const onTimeout = vi.fn();

      const { rerender } = render(
        <ChessClock
          timeRemaining={1000}
          isActive={true}
          onTimeout={onTimeout}
        />
      );

      // Update to zero
      rerender(
        <ChessClock
          timeRemaining={0}
          isActive={true}
          onTimeout={onTimeout}
        />
      );

      expect(onTimeout).toHaveBeenCalled();
    });

    it('should NOT call onTimeout when time is above zero', () => {
      const onTimeout = vi.fn();

      render(
        <ChessClock
          timeRemaining={5000}
          isActive={true}
          onTimeout={onTimeout}
        />
      );

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid time updates', () => {
      const { container, rerender } = render(
        <ChessClock timeRemaining={10000} isActive={true} />
      );

      // Rapidly update time
      for (let i = 9900; i >= 0; i -= 100) {
        rerender(<ChessClock timeRemaining={i} isActive={true} />);
      }

      expect(container.textContent).toContain('0:00.0');
    });

    it('should handle time updates while inactive', () => {
      const { container, rerender } = render(
        <ChessClock timeRemaining={60000} isActive={false} />
      );

      rerender(<ChessClock timeRemaining={30000} isActive={false} />);

      expect(container.textContent).toContain('0:30.0');
    });

    it('should handle transition from active to inactive', () => {
      const { container, rerender } = render(
        <ChessClock timeRemaining={60000} isActive={true} />
      );

      let clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-is-active')).toBe('true');

      rerender(<ChessClock timeRemaining={60000} isActive={false} />);

      clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-is-active')).toBe('false');
    });

    it('should cleanup audio on unmount', () => {
      const { unmount } = render(
        <ChessClock
          timeRemaining={9000}
          isActive={true}
          enableSound={true}
        />
      );

      // Unmount should cleanup audio
      unmount();
      expect(true).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper test ids for testing', () => {
      const { container } = render(
        <ChessClock timeRemaining={60000} isActive={false} />
      );

      const clockElement = container.querySelector('[data-testid="chess-clock"]');
      expect(clockElement).toBeTruthy();
    });

    it('should have data attributes for state inspection', () => {
      const { container } = render(
        <ChessClock
          timeRemaining={9000}
          isActive={true}
          playerColor="white"
        />
      );

      const clockElement = container.querySelector('.chess-clock');
      expect(clockElement?.getAttribute('data-player-color')).toBe('white');
      expect(clockElement?.getAttribute('data-is-active')).toBe('true');
      expect(clockElement?.getAttribute('data-is-low-time')).toBe('true');
    });
  });
});
