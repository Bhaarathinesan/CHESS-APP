import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../useTheme';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should initialize with dark theme by default', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      // Trigger the effect
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should toggle theme from dark to light', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should toggle theme from light to dark', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should set theme directly', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should persist theme in localStorage', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });

    expect(localStorage.getItem('theme')).toBe('light');

    // Simulate page reload
    const { result: result2 } = renderHook(() => useTheme());
    expect(result2.current.theme).toBe('light');
  });

  it('should apply dark class to document element when theme is dark', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should remove dark class from document element when theme is light', () => {
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should be mounted after initial render', () => {
    const { result } = renderHook(() => useTheme());
    
    // After the effect runs, mounted should be true
    expect(result.current.mounted).toBe(true);
  });
});
