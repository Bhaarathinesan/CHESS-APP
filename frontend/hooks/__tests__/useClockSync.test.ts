import { renderHook, act } from '@testing-library/react';
import { useClockSync } from '../useClockSync';
import { Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');

describe('useClockSync', () => {
  let mockSocket: Partial<Socket>;
  let eventHandlers: Record<string, Function>;

  beforeEach(() => {
    jest.useFakeTimers();
    eventHandlers = {};

    mockSocket = {
      on: jest.fn((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      }),
      off: jest.fn((event: string) => {
        delete eventHandlers[event];
      }),
      emit: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Clock Synchronization', () => {
    it('should receive and apply clock sync updates from server', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // Simulate server clock sync
      act(() => {
        eventHandlers['clock_sync']({
          gameId: 'game-123',
          whiteTimeRemaining: 300000,
          blackTimeRemaining: 295000,
          serverTimestamp: Date.now(),
        });
      });

      expect(result.current.whiteTimeRemaining).toBe(300000);
      expect(result.current.blackTimeRemaining).toBe(295000);
    });

    it('should ignore clock sync for different game', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      const initialWhiteTime = result.current.whiteTimeRemaining;

      act(() => {
        eventHandlers['clock_sync']({
          gameId: 'game-456',
          whiteTimeRemaining: 300000,
          blackTimeRemaining: 295000,
          serverTimestamp: Date.now(),
        });
      });

      expect(result.current.whiteTimeRemaining).toBe(initialWhiteTime);
    });

    it('should sync clocks every 1 second from server (Requirement 6.10)', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // First sync
      act(() => {
        eventHandlers['clock_sync']({
          gameId: 'game-123',
          whiteTimeRemaining: 300000,
          blackTimeRemaining: 300000,
          serverTimestamp: Date.now(),
        });
      });

      expect(result.current.whiteTimeRemaining).toBe(300000);

      // Second sync after 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
        eventHandlers['clock_sync']({
          gameId: 'game-123',
          whiteTimeRemaining: 299000,
          blackTimeRemaining: 300000,
          serverTimestamp: Date.now() + 1000,
        });
      });

      expect(result.current.whiteTimeRemaining).toBe(299000);
    });
  });

  describe('Clock Drift Correction', () => {
    it('should calculate drift offset for network latency', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      const serverTimestamp = Date.now();

      act(() => {
        eventHandlers['clock_sync']({
          gameId: 'game-123',
          whiteTimeRemaining: 300000,
          blackTimeRemaining: 300000,
          serverTimestamp,
        });
      });

      // Drift offset should be calculated
      expect(result.current.driftOffset).toBeDefined();
    });

    it('should maintain clock accuracy within 100ms (Requirement 5.7)', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // Simulate multiple sync updates with varying latency
      const syncs = [
        { latency: 20, whiteTime: 300000 },
        { latency: 50, whiteTime: 299000 },
        { latency: 30, whiteTime: 298000 },
      ];

      syncs.forEach((sync) => {
        act(() => {
          const serverTimestamp = Date.now();
          eventHandlers['clock_sync']({
            gameId: 'game-123',
            whiteTimeRemaining: sync.whiteTime,
            blackTimeRemaining: 300000,
            serverTimestamp,
          });
        });

        // Drift should be within acceptable range
        expect(Math.abs(result.current.driftOffset)).toBeLessThan(100);
      });
    });
  });

  describe('Local Countdown', () => {
    it('should decrement active player clock locally between syncs', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // Set initial clock state
      act(() => {
        result.current.setClockTimes(300000, 300000);
        result.current.setCurrentTurn('white');
      });

      const initialWhiteTime = result.current.whiteTimeRemaining;

      // Advance time by 500ms (5 ticks at 100ms each)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // White's time should have decreased (approximately 500ms)
      expect(result.current.whiteTimeRemaining).toBeLessThan(initialWhiteTime);
      expect(result.current.whiteTimeRemaining).toBeGreaterThan(initialWhiteTime - 600);
      // Black's time should remain the same
      expect(result.current.blackTimeRemaining).toBe(300000);
    });

    it('should not decrement time below zero', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      act(() => {
        result.current.setClockTimes(50, 300000);
        result.current.setCurrentTurn('white');
      });

      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.whiteTimeRemaining).toBe(0);
    });

    it('should switch countdown when turn changes', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      act(() => {
        result.current.setClockTimes(300000, 300000);
        result.current.setCurrentTurn('white');
      });

      // Advance time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      const whiteTimeAfterMove = result.current.whiteTimeRemaining;
      const blackTimeBeforeMove = result.current.blackTimeRemaining;

      // Switch turn to black
      act(() => {
        result.current.setCurrentTurn('black');
      });

      // Advance time
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // White's time should not change further
      expect(result.current.whiteTimeRemaining).toBe(whiteTimeAfterMove);
      // Black's time should decrease
      expect(result.current.blackTimeRemaining).toBeLessThan(blackTimeBeforeMove);
    });
  });

  describe('Server Authority', () => {
    it('should override local countdown with server sync (Requirement 5.12)', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // Set initial state
      act(() => {
        result.current.setClockTimes(300000, 300000);
        result.current.setCurrentTurn('white');
      });

      // Let local countdown run
      act(() => {
        jest.advanceTimersByTime(500);
      });

      const localWhiteTime = result.current.whiteTimeRemaining;

      // Server sync with authoritative time
      act(() => {
        eventHandlers['clock_sync']({
          gameId: 'game-123',
          whiteTimeRemaining: 299000, // Server says different time
          blackTimeRemaining: 300000,
          serverTimestamp: Date.now(),
        });
      });

      // Should use server time, not local countdown
      expect(result.current.whiteTimeRemaining).toBe(299000);
      expect(result.current.whiteTimeRemaining).not.toBe(localWhiteTime);
    });
  });

  describe('Cleanup', () => {
    it('should unregister event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      expect(mockSocket.on).toHaveBeenCalledWith('clock_sync', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('player_disconnected', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('clock_resumed_after_disconnect', expect.any(Function));

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('clock_sync');
      expect(mockSocket.off).toHaveBeenCalledWith('player_disconnected');
      expect(mockSocket.off).toHaveBeenCalledWith('clock_resumed_after_disconnect');
    });

    it('should clear local interval on unmount', () => {
      const { unmount } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null socket gracefully', () => {
      const { result } = renderHook(() => useClockSync(null, 'game-123'));

      expect(result.current.whiteTimeRemaining).toBe(0);
      expect(result.current.blackTimeRemaining).toBe(0);
    });

    it('should handle null gameId gracefully', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, null)
      );

      expect(result.current.whiteTimeRemaining).toBe(0);
      expect(result.current.blackTimeRemaining).toBe(0);
    });

    it('should handle rapid sync updates', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // Send multiple syncs rapidly
      for (let i = 0; i < 10; i++) {
        act(() => {
          eventHandlers['clock_sync']({
            gameId: 'game-123',
            whiteTimeRemaining: 300000 - i * 1000,
            blackTimeRemaining: 300000,
            serverTimestamp: Date.now() + i * 100,
          });
        });
      }

      // Should have the last sync value
      expect(result.current.whiteTimeRemaining).toBe(291000);
    });
  });

  describe('Disconnection Handling', () => {
    it('should pause clock when player disconnects (Requirement 5.10)', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // Set initial state
      act(() => {
        result.current.setClockTimes(300000, 300000);
        result.current.setCurrentTurn('white');
      });

      // Simulate player disconnection
      act(() => {
        eventHandlers['player_disconnected']({
          gameId: 'game-123',
          playerId: 'player-1',
          pausedAt: Date.now(),
        });
      });

      // Clock should be paused
      expect(result.current.isPaused).toBe(true);

      const timeBeforePause = result.current.whiteTimeRemaining;

      // Advance time - clock should not decrement when paused
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.whiteTimeRemaining).toBe(timeBeforePause);
    });

    it('should resume clock after reconnection', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      // Set initial state and pause
      act(() => {
        result.current.setClockTimes(300000, 300000);
        result.current.setCurrentTurn('white');
        eventHandlers['player_disconnected']({
          gameId: 'game-123',
          playerId: 'player-1',
          pausedAt: Date.now(),
        });
      });

      expect(result.current.isPaused).toBe(true);

      // Resume clock
      act(() => {
        eventHandlers['clock_resumed_after_disconnect']({
          gameId: 'game-123',
          playerId: 'player-1',
          resumedAt: Date.now(),
        });
      });

      expect(result.current.isPaused).toBe(false);

      const timeAfterResume = result.current.whiteTimeRemaining;

      // Clock should decrement after resume
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(result.current.whiteTimeRemaining).toBeLessThan(timeAfterResume);
    });

    it('should ignore disconnection events for different games', () => {
      const { result } = renderHook(() =>
        useClockSync(mockSocket as Socket, 'game-123')
      );

      act(() => {
        result.current.setClockTimes(300000, 300000);
      });

      expect(result.current.isPaused).toBe(false);

      // Disconnection for different game
      act(() => {
        eventHandlers['player_disconnected']({
          gameId: 'game-456',
          playerId: 'player-1',
          pausedAt: Date.now(),
        });
      });

      // Should not affect this game's clock
      expect(result.current.isPaused).toBe(false);
    });
  });
});
