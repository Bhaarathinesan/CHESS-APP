/**
 * Tests for useSoundPreferences hook
 * Requirements: 23.12-23.15
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSoundPreferences } from '../useSoundPreferences';
import { audioService } from '@/lib/audio-service';
import { vi } from 'vitest';

// Mock the audio service
vi.mock('@/lib/audio-service', () => ({
  audioService: {
    initialize: vi.fn().mockResolvedValue(undefined),
    updatePreferences: vi.fn(),
    play: vi.fn(),
    startLowTimeWarning: vi.fn(),
    stopLowTimeWarning: vi.fn(),
    resume: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('useSoundPreferences', () => {
  const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes with default preferences', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.preferences.enabled).toBe(true);
    expect(result.current.preferences.volume).toBe(70);
    expect(audioService.initialize).toHaveBeenCalled();
  });

  it('loads preferences from localStorage', async () => {
    const savedPreferences = {
      enabled: false,
      volume: 50,
      effects: {
        move: true,
        capture: false,
        check: true,
        checkmate: true,
        castling: true,
        gameStart: true,
        gameEnd: true,
        notification: true,
        challenge: true,
        chatMessage: true,
        lowTime: false,
      },
    };

    mockLocalStorage.setItem(
      'chess-sound-preferences',
      JSON.stringify(savedPreferences)
    );

    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    expect(result.current.preferences.enabled).toBe(false);
    expect(result.current.preferences.volume).toBe(50);
    expect(result.current.preferences.effects.capture).toBe(false);
    expect(audioService.updatePreferences).toHaveBeenCalledWith(
      savedPreferences
    );
  });

  it('sets volume and saves to localStorage', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.setVolume(80);
    });

    await waitFor(() => {
      expect(result.current.preferences.volume).toBe(80);
    });

    const saved = JSON.parse(
      mockLocalStorage.getItem('chess-sound-preferences') || '{}'
    );
    expect(saved.volume).toBe(80);
    expect(audioService.updatePreferences).toHaveBeenCalled();
  });

  it('clamps volume to 0-100 range', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.setVolume(150);
    });

    await waitFor(() => {
      expect(result.current.preferences.volume).toBe(100);
    });

    act(() => {
      result.current.setVolume(-10);
    });

    await waitFor(() => {
      expect(result.current.preferences.volume).toBe(0);
    });
  });

  it('toggles enabled state', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.setEnabled(false);
    });

    await waitFor(() => {
      expect(result.current.preferences.enabled).toBe(false);
    });

    const saved = JSON.parse(
      mockLocalStorage.getItem('chess-sound-preferences') || '{}'
    );
    expect(saved.enabled).toBe(false);
  });

  it('toggles individual sound effect', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.toggleEffect('move', false);
    });

    await waitFor(() => {
      expect(result.current.preferences.effects.move).toBe(false);
    });

    const saved = JSON.parse(
      mockLocalStorage.getItem('chess-sound-preferences') || '{}'
    );
    expect(saved.effects.move).toBe(false);
  });

  it('plays sound through audio service', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.playSound('move');
    });

    expect(audioService.play).toHaveBeenCalledWith('move');
  });

  it('starts low time warning', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.startLowTimeWarning();
    });

    expect(audioService.startLowTimeWarning).toHaveBeenCalled();
  });

  it('stops low time warning', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    act(() => {
      result.current.stopLowTimeWarning();
    });

    expect(audioService.stopLowTimeWarning).toHaveBeenCalled();
  });

  it('resumes audio context', async () => {
    const { result } = renderHook(() => useSoundPreferences());

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    await act(async () => {
      await result.current.resumeAudio();
    });

    expect(audioService.resume).toHaveBeenCalled();
  });
});
