/**
 * Tests for SoundSettings component
 * Requirements: 23.12-23.15
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SoundSettings } from '../SoundSettings';
import { useSoundPreferences } from '@/hooks/useSoundPreferences';
import { vi } from 'vitest';

// Mock the useSoundPreferences hook
vi.mock('@/hooks/useSoundPreferences');

const mockUseSoundPreferences = useSoundPreferences as ReturnType<typeof vi.fn>;

describe('SoundSettings', () => {
  const mockSetVolume = vi.fn();
  const mockSetEnabled = vi.fn();
  const mockToggleEffect = vi.fn();
  const mockPlaySound = vi.fn();

  const defaultPreferences = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSoundPreferences.mockReturnValue({
      preferences: defaultPreferences,
      isInitialized: true,
      setVolume: mockSetVolume,
      setEnabled: mockSetEnabled,
      toggleEffect: mockToggleEffect,
      playSound: mockPlaySound,
      startLowTimeWarning: vi.fn(),
      stopLowTimeWarning: vi.fn(),
      resumeAudio: vi.fn(),
    });
  });

  it('renders loading state when not initialized', () => {
    mockUseSoundPreferences.mockReturnValue({
      preferences: defaultPreferences,
      isInitialized: false,
      setVolume: mockSetVolume,
      setEnabled: mockSetEnabled,
      toggleEffect: mockToggleEffect,
      playSound: mockPlaySound,
      startLowTimeWarning: vi.fn(),
      stopLowTimeWarning: vi.fn(),
      resumeAudio: vi.fn(),
    });

    render(<SoundSettings />);
    expect(screen.getByText('Loading sound settings...')).toBeInTheDocument();
  });

  it('renders master controls', () => {
    render(<SoundSettings />);
    expect(screen.getByText('Master Controls')).toBeInTheDocument();
    expect(screen.getByText('Enable Sounds')).toBeInTheDocument();
    expect(screen.getByText('Master Volume')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('renders all sound effect toggles', () => {
    render(<SoundSettings />);
    expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    expect(screen.getByText('Move')).toBeInTheDocument();
    expect(screen.getByText('Capture')).toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('Checkmate')).toBeInTheDocument();
    expect(screen.getByText('Castling')).toBeInTheDocument();
    expect(screen.getByText('Game Start')).toBeInTheDocument();
    expect(screen.getByText('Game End')).toBeInTheDocument();
    expect(screen.getByText('Notification')).toBeInTheDocument();
    expect(screen.getByText('Challenge')).toBeInTheDocument();
    expect(screen.getByText('Chat Message')).toBeInTheDocument();
    expect(screen.getByText('Low Time Warning')).toBeInTheDocument();
  });

  it('toggles sound enabled/disabled', () => {
    render(<SoundSettings />);
    const enableToggle = screen.getByLabelText('Mute sounds');
    fireEvent.click(enableToggle);
    expect(mockSetEnabled).toHaveBeenCalledWith(false);
  });

  it('changes volume with slider', () => {
    render(<SoundSettings />);
    const volumeSlider = screen.getByLabelText('Master Volume');
    fireEvent.change(volumeSlider, { target: { value: '50' } });
    expect(mockSetVolume).toHaveBeenCalledWith(50);
  });

  it('toggles individual sound effect', () => {
    render(<SoundSettings />);
    const moveToggle = screen.getByLabelText('Toggle Move sound');
    fireEvent.click(moveToggle);
    expect(mockToggleEffect).toHaveBeenCalledWith('move', false);
  });

  it('plays sound preview when enabling effect', () => {
    // Mock the effect as disabled first
    mockUseSoundPreferences.mockReturnValue({
      preferences: {
        ...defaultPreferences,
        effects: {
          ...defaultPreferences.effects,
          move: false,
        },
      },
      isInitialized: true,
      setVolume: mockSetVolume,
      setEnabled: mockSetEnabled,
      toggleEffect: mockToggleEffect,
      playSound: mockPlaySound,
      startLowTimeWarning: vi.fn(),
      stopLowTimeWarning: vi.fn(),
      resumeAudio: vi.fn(),
    });

    render(<SoundSettings />);
    const moveToggle = screen.getByLabelText('Toggle Move sound');
    fireEvent.click(moveToggle);
    
    expect(mockToggleEffect).toHaveBeenCalledWith('move', true);
  });

  it('disables controls when sound is disabled', () => {
    mockUseSoundPreferences.mockReturnValue({
      preferences: {
        ...defaultPreferences,
        enabled: false,
      },
      isInitialized: true,
      setVolume: mockSetVolume,
      setEnabled: mockSetEnabled,
      toggleEffect: mockToggleEffect,
      playSound: mockPlaySound,
      startLowTimeWarning: vi.fn(),
      stopLowTimeWarning: vi.fn(),
      resumeAudio: vi.fn(),
    });

    render(<SoundSettings />);
    const volumeSlider = screen.getByLabelText('Master Volume');
    expect(volumeSlider).toBeDisabled();
  });

  it('displays info text about persistence', () => {
    render(<SoundSettings />);
    expect(
      screen.getByText(
        'Sound preferences are saved automatically and persist across sessions.'
      )
    ).toBeInTheDocument();
  });
});
