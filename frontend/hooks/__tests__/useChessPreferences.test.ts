import { renderHook, act } from '@testing-library/react';
import { useChessPreferences } from '../useChessPreferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useChessPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('initializes with default preferences', () => {
    const { result } = renderHook(() => useChessPreferences());
    
    expect(result.current.preferences).toEqual({
      boardTheme: 'default',
      pieceSet: 'default',
    });
  });

  it('loads preferences from localStorage', () => {
    localStorageMock.setItem(
      'chess-preferences',
      JSON.stringify({
        boardTheme: 'blue',
        pieceSet: 'alpha',
      })
    );

    const { result } = renderHook(() => useChessPreferences());

    // Wait for the effect to run
    act(() => {
      // Trigger a re-render
    });

    expect(result.current.preferences.boardTheme).toBe('blue');
    expect(result.current.preferences.pieceSet).toBe('alpha');
  });

  it('updates board theme', () => {
    const { result } = renderHook(() => useChessPreferences());

    act(() => {
      result.current.setBoardTheme('green');
    });

    expect(result.current.preferences.boardTheme).toBe('green');
  });

  it('updates piece set', () => {
    const { result } = renderHook(() => useChessPreferences());

    act(() => {
      result.current.setPieceSet('california');
    });

    expect(result.current.preferences.pieceSet).toBe('california');
  });

  it('persists preferences to localStorage', async () => {
    const { result } = renderHook(() => useChessPreferences());

    act(() => {
      result.current.setBoardTheme('purple');
      result.current.setPieceSet('merida');
    });

    // Wait for the effect to save to localStorage
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stored = localStorageMock.getItem('chess-preferences');
    expect(stored).toBeTruthy();
    
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.boardTheme).toBe('purple');
      expect(parsed.pieceSet).toBe('merida');
    }
  });

  it('resets preferences to default', () => {
    const { result } = renderHook(() => useChessPreferences());

    act(() => {
      result.current.setBoardTheme('wood');
      result.current.setPieceSet('pixel');
    });

    expect(result.current.preferences.boardTheme).toBe('wood');
    expect(result.current.preferences.pieceSet).toBe('pixel');

    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.preferences).toEqual({
      boardTheme: 'default',
      pieceSet: 'default',
    });
  });

  it('handles invalid localStorage data gracefully', () => {
    localStorageMock.setItem('chess-preferences', 'invalid json');

    const { result } = renderHook(() => useChessPreferences());

    expect(result.current.preferences).toEqual({
      boardTheme: 'default',
      pieceSet: 'default',
    });
  });

  it('handles partial localStorage data', () => {
    localStorageMock.setItem(
      'chess-preferences',
      JSON.stringify({
        boardTheme: 'gray',
        // pieceSet is missing
      })
    );

    const { result } = renderHook(() => useChessPreferences());

    act(() => {
      // Trigger a re-render
    });

    expect(result.current.preferences.boardTheme).toBe('gray');
    expect(result.current.preferences.pieceSet).toBe('default');
  });

  it('sets isLoaded to true after initialization', () => {
    const { result } = renderHook(() => useChessPreferences());

    expect(result.current.isLoaded).toBe(true);
  });
});
