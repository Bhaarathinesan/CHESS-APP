import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import BoardSettings from '../BoardSettings';

// Mock the hooks with default values
const mockSetHapticEnabled = vi.fn();
const mockTriggerHaptic = vi.fn();
const mockSetBoardTheme = vi.fn();
const mockSetPieceSet = vi.fn();
const mockResetPreferences = vi.fn();
const mockUpdatePreferences = vi.fn();

vi.mock('@/hooks/useChessPreferences', () => ({
  useChessPreferences: () => ({
    preferences: {
      boardTheme: 'default',
      pieceSet: 'default',
      hapticEnabled: true,
    },
    setBoardTheme: mockSetBoardTheme,
    setPieceSet: mockSetPieceSet,
    resetPreferences: mockResetPreferences,
    updatePreferences: mockUpdatePreferences,
    isLoaded: true,
  }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    isSupported: true,
    isEnabled: true,
    setHapticEnabled: mockSetHapticEnabled,
    triggerHaptic: mockTriggerHaptic,
  }),
}));

describe('BoardSettings - Haptic Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all three tabs including Preferences', () => {
    render(<BoardSettings />);
    
    expect(screen.getByText('Board Themes')).toBeDefined();
    expect(screen.getByText('Piece Sets')).toBeDefined();
    expect(screen.getByText('Preferences')).toBeDefined();
  });

  it('should show haptic feedback toggle in Preferences tab', () => {
    render(<BoardSettings />);
    
    // Click on Preferences tab
    const preferencesTab = screen.getByText('Preferences');
    fireEvent.click(preferencesTab);
    
    // Check for haptic feedback setting
    expect(screen.getByText('Haptic Feedback')).toBeDefined();
    expect(screen.getByText('Vibrate on piece moves, captures, and check')).toBeDefined();
  });

  it('should call setHapticEnabled when toggle is clicked', () => {
    render(<BoardSettings />);
    
    // Click on Preferences tab
    const preferencesTab = screen.getByText('Preferences');
    fireEvent.click(preferencesTab);
    
    // Find the toggle button (it's the button with the toggle switch)
    const toggleButtons = screen.getAllByRole('button');
    // The toggle is one of the buttons - find it by checking for the switch span
    const toggleButton = toggleButtons.find(btn => 
      btn.querySelector('span.inline-block')
    );
    
    expect(toggleButton).toBeDefined();
    
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(mockSetHapticEnabled).toHaveBeenCalled();
    }
  });

  it('should have correct visual state when haptic is enabled', () => {
    render(<BoardSettings />);
    
    // Click on Preferences tab
    const preferencesTab = screen.getByText('Preferences');
    fireEvent.click(preferencesTab);
    
    // Find the toggle button
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => 
      btn.querySelector('span.inline-block')
    );
    
    expect(toggleButton).toBeDefined();
    
    if (toggleButton) {
      // Should have blue background when enabled
      expect(toggleButton.className).toContain('bg-blue-600');
    }
  });

  it('should call onClose when Done button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<BoardSettings onClose={mockOnClose} />);
    
    const doneButton = screen.getByText('Done');
    fireEvent.click(doneButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call resetPreferences when Reset button is clicked', () => {
    render(<BoardSettings />);
    
    const resetButton = screen.getByText('Reset to Default');
    fireEvent.click(resetButton);
    
    expect(mockResetPreferences).toHaveBeenCalled();
  });

  it('should switch between tabs correctly', () => {
    render(<BoardSettings />);
    
    // Initially on Board Themes tab
    expect(screen.getByText('Classic Brown')).toBeDefined();
    
    // Click on Piece Sets tab
    const pieceSetsTab = screen.getByText('Piece Sets');
    fireEvent.click(pieceSetsTab);
    
    // Should show piece sets
    expect(screen.getByText('Classic')).toBeDefined();
    
    // Click on Preferences tab
    const preferencesTab = screen.getByText('Preferences');
    fireEvent.click(preferencesTab);
    
    // Should show preferences
    expect(screen.getByText('Haptic Feedback')).toBeDefined();
  });
});
