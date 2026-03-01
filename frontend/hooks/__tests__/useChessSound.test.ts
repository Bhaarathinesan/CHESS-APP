/**
 * Tests for useChessSound hook
 * Requirements: 23.1-23.11
 */

import { renderHook, act } from '@testing-library/react';
import { useChessSound } from '../useChessSound';
import { useSoundPreferences } from '../useSoundPreferences';
import { Chess } from 'chess.js';
import { vi } from 'vitest';

// Mock the useSoundPreferences hook
vi.mock('../useSoundPreferences');

const mockUseSoundPreferences = useSoundPreferences as ReturnType<typeof vi.fn>;

describe('useChessSound', () => {
  const mockPlaySound = vi.fn();
  const mockStartLowTimeWarning = vi.fn();
  const mockStopLowTimeWarning = vi.fn();
  const mockResumeAudio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSoundPreferences.mockReturnValue({
      preferences: {
        enabled: true,
        volume: 70,
        effects: {
          move: true,
          capture: true,
          check: true,
          checkmate: true,
          castling: true,
          gameStart: true,
          gameEnd: true,
          notification: true,
          challenge: true,
          chatMessage: true,
          lowTime: true,
        },
      },
      isInitialized: true,
      setVolume: vi.fn(),
      setEnabled: vi.fn(),
      toggleEffect: vi.fn(),
      playSound: mockPlaySound,
      startLowTimeWarning: mockStartLowTimeWarning,
      stopLowTimeWarning: mockStopLowTimeWarning,
      resumeAudio: mockResumeAudio,
    });
  });

  it('starts low time warning when time < 10 seconds', () => {
    const game = new Chess();
    const { rerender } = renderHook(
      ({ timeRemaining }) =>
        useChessSound({ game, timeRemaining, isGameActive: true }),
      { initialProps: { timeRemaining: 15000 } }
    );

    expect(mockStartLowTimeWarning).not.toHaveBeenCalled();

    // Update to low time
    rerender({ timeRemaining: 9000 });
    expect(mockStartLowTimeWarning).toHaveBeenCalled();
  });

  it('stops low time warning when time >= 10 seconds', () => {
    const game = new Chess();
    const { rerender } = renderHook(
      ({ timeRemaining }) =>
        useChessSound({ game, timeRemaining, isGameActive: true }),
      { initialProps: { timeRemaining: 5000 } }
    );

    expect(mockStartLowTimeWarning).toHaveBeenCalled();

    // Update to normal time
    rerender({ timeRemaining: 15000 });
    expect(mockStopLowTimeWarning).toHaveBeenCalled();
  });

  it('stops low time warning when game is not active', () => {
    const game = new Chess();
    renderHook(() =>
      useChessSound({ game, timeRemaining: 5000, isGameActive: false })
    );

    expect(mockStopLowTimeWarning).toHaveBeenCalled();
    expect(mockStartLowTimeWarning).not.toHaveBeenCalled();
  });

  it('plays move sound for regular move', () => {
    const game = new Chess();
    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playMoveSound({
        from: 'e2',
        to: 'e4',
        flags: 'n',
      } as any);
    });

    expect(mockResumeAudio).toHaveBeenCalled();
    expect(mockPlaySound).toHaveBeenCalledWith('move');
  });

  it('plays capture sound for capture move', () => {
    const game = new Chess();
    game.load('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2');
    
    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playMoveSound({
        from: 'e4',
        to: 'e5',
        flags: 'c',
      } as any);
    });

    expect(mockPlaySound).toHaveBeenCalledWith('capture');
  });

  it('plays castling sound for castling move', () => {
    const game = new Chess();
    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playMoveSound({
        from: 'e1',
        to: 'g1',
        flags: 'k',
      } as any);
    });

    expect(mockPlaySound).toHaveBeenCalledWith('castling');
  });

  it('plays checkmate sound after move results in checkmate', () => {
    const game = new Chess();
    // Fool's mate position
    game.load('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2');
    game.move({ from: 'd8', to: 'h4' }); // Checkmate

    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playMoveSound({
        from: 'd8',
        to: 'h4',
        flags: 'n',
      } as any);
    });

    expect(mockPlaySound).toHaveBeenCalledWith('move');
    expect(mockPlaySound).toHaveBeenCalledWith('checkmate');
  });

  it('plays game start sound', () => {
    const game = new Chess();
    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playGameStart();
    });

    expect(mockResumeAudio).toHaveBeenCalled();
    expect(mockPlaySound).toHaveBeenCalledWith('gameStart');
  });

  it('plays game end sound and stops low time warning', () => {
    const game = new Chess();
    const { result } = renderHook(() =>
      useChessSound({ game, timeRemaining: 5000, isGameActive: true })
    );

    act(() => {
      result.current.playGameEnd();
    });

    expect(mockStopLowTimeWarning).toHaveBeenCalled();
    expect(mockPlaySound).toHaveBeenCalledWith('gameEnd');
  });

  it('plays notification sound', () => {
    const game = new Chess();
    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playNotification();
    });

    expect(mockResumeAudio).toHaveBeenCalled();
    expect(mockPlaySound).toHaveBeenCalledWith('notification');
  });

  it('plays challenge sound', () => {
    const game = new Chess();
    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playChallenge();
    });

    expect(mockResumeAudio).toHaveBeenCalled();
    expect(mockPlaySound).toHaveBeenCalledWith('challenge');
  });

  it('plays chat message sound', () => {
    const game = new Chess();
    const { result } = renderHook(() =>
      useChessSound({ game, isGameActive: true })
    );

    act(() => {
      result.current.playChatMessage();
    });

    expect(mockResumeAudio).toHaveBeenCalled();
    expect(mockPlaySound).toHaveBeenCalledWith('chatMessage');
  });

  it('cleans up low time warning on unmount', () => {
    const game = new Chess();
    const { unmount } = renderHook(() =>
      useChessSound({ game, timeRemaining: 5000, isGameActive: true })
    );

    unmount();
    expect(mockStopLowTimeWarning).toHaveBeenCalled();
  });
});
