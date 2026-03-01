/**
 * AudioService - Manages sound effects playback
 * Requirements: 23.1-23.15
 */

import { SoundEffectType, SoundPreferences } from '@/types/sound-preferences';

class AudioService {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundEffectType, HTMLAudioElement> = new Map();
  private preferences: SoundPreferences = {
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
  private initialized = false;
  private lowTimeInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the audio service and preload sound files
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create audio context for better control
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        this.audioContext = new AudioContext();
      }

      // Preload all sound files
      const soundFiles: Record<SoundEffectType, string> = {
        move: '/sounds/move.mp3',
        capture: '/sounds/capture.mp3',
        check: '/sounds/check.mp3',
        checkmate: '/sounds/checkmate.mp3',
        castling: '/sounds/castling.mp3',
        gameStart: '/sounds/game-start.mp3',
        gameEnd: '/sounds/game-end.mp3',
        notification: '/sounds/notification.mp3',
        challenge: '/sounds/challenge.mp3',
        chatMessage: '/sounds/chat.mp3',
        lowTime: '/sounds/low-time.mp3',
      };

      for (const [type, path] of Object.entries(soundFiles)) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.preferences.volume / 100;
        this.sounds.set(type as SoundEffectType, audio);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioService:', error);
    }
  }

  /**
   * Play a sound effect
   * Requirements: 23.1-23.11
   */
  play(type: SoundEffectType): void {
    if (!this.initialized || !this.preferences.enabled) return;
    if (!this.preferences.effects[type]) return;

    const audio = this.sounds.get(type);
    if (!audio) return;

    try {
      // Clone the audio element to allow overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.preferences.volume / 100;
      clone.play().catch((error) => {
        console.error(`Failed to play sound ${type}:`, error);
      });
    } catch (error) {
      console.error(`Error playing sound ${type}:`, error);
    }
  }

  /**
   * Start playing the low time ticking sound
   * Requirements: 23.8
   */
  startLowTimeWarning(): void {
    if (this.lowTimeInterval) return;

    // Play immediately
    this.play('lowTime');

    // Then play every second
    this.lowTimeInterval = setInterval(() => {
      this.play('lowTime');
    }, 1000);
  }

  /**
   * Stop playing the low time ticking sound
   */
  stopLowTimeWarning(): void {
    if (this.lowTimeInterval) {
      clearInterval(this.lowTimeInterval);
      this.lowTimeInterval = null;
    }
  }

  /**
   * Update sound preferences
   * Requirements: 23.12-23.15
   */
  updatePreferences(preferences: Partial<SoundPreferences>): void {
    this.preferences = {
      ...this.preferences,
      ...preferences,
      effects: {
        ...this.preferences.effects,
        ...(preferences.effects || {}),
      },
    };

    // Update volume for all loaded sounds
    const volume = this.preferences.volume / 100;
    this.sounds.forEach((audio) => {
      audio.volume = volume;
    });

    // Stop low time warning if sound is disabled
    if (!this.preferences.enabled || !this.preferences.effects.lowTime) {
      this.stopLowTimeWarning();
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): SoundPreferences {
    return { ...this.preferences };
  }

  /**
   * Set master volume (0-100)
   * Requirements: 23.12
   */
  setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    this.updatePreferences({ volume: clampedVolume });
  }

  /**
   * Toggle mute
   * Requirements: 23.13
   */
  setEnabled(enabled: boolean): void {
    this.updatePreferences({ enabled });
    if (!enabled) {
      this.stopLowTimeWarning();
    }
  }

  /**
   * Toggle individual sound effect
   * Requirements: 23.14
   */
  toggleEffect(type: SoundEffectType, enabled: boolean): void {
    this.updatePreferences({
      effects: {
        ...this.preferences.effects,
        [type]: enabled,
      },
    });
  }

  /**
   * Resume audio context (needed after user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stopLowTimeWarning();
    this.sounds.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.initialized = false;
  }
}

// Export singleton instance
export const audioService = new AudioService();
