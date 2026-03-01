'use client';

import { useEffect, useState, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

export interface ChessClockProps {
  /** Time remaining in milliseconds */
  timeRemaining: number;
  /** Whether this clock is currently active/running */
  isActive: boolean;
  /** Player name to display */
  playerName?: string;
  /** Player color (for styling) */
  playerColor?: 'white' | 'black';
  /** Whether to show visual warning at low time */
  showWarning?: boolean;
  /** Callback when time runs out */
  onTimeout?: () => void;
  /** Whether the clock should play ticking sound at 10 seconds */
  enableSound?: boolean;
  /** Time control display (e.g., "5+3") - optional */
  timeControlDisplay?: string;
  /** Custom className for styling */
  className?: string;
}

/**
 * ChessClock component displays countdown timer for chess games
 * 
 * Features:
 * - Displays time with decisecond precision (Requirement 5.13)
 * - Visual warning when time reaches 10 seconds (Requirement 5.8)
 * - Plays ticking sound when time reaches 10 seconds (Requirement 23.8)
 * - Smooth countdown animation
 * - Color-coded display based on time remaining
 */
export default function ChessClock({
  timeRemaining,
  isActive,
  playerName,
  playerColor,
  showWarning = true,
  onTimeout,
  enableSound = true,
  timeControlDisplay,
  className = '',
}: ChessClockProps) {
  const [displayTime, setDisplayTime] = useState(timeRemaining);
  const [isLowTime, setIsLowTime] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedSound = useRef(false);

  // Update display time
  useEffect(() => {
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  // Check for low time warning (10 seconds = 10000ms)
  useEffect(() => {
    const lowTimeThreshold = 10000;
    const wasLowTime = isLowTime;
    const nowLowTime = displayTime <= lowTimeThreshold && displayTime > 0;
    
    setIsLowTime(nowLowTime);

    // Play ticking sound when entering low time state (Requirement 23.8)
    if (enableSound && nowLowTime && !wasLowTime && !hasPlayedSound.current) {
      playTickingSound();
      hasPlayedSound.current = true;
    }

    // Reset sound flag when time goes back above threshold
    if (!nowLowTime && hasPlayedSound.current) {
      hasPlayedSound.current = false;
      stopTickingSound();
    }
  }, [displayTime, isLowTime, enableSound]);

  // Handle timeout
  useEffect(() => {
    if (displayTime <= 0 && onTimeout) {
      onTimeout();
    }
  }, [displayTime, onTimeout]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopTickingSound();
    };
  }, []);

  const playTickingSound = () => {
    // Create audio element for ticking sound
    // In a real implementation, this would load an actual audio file
    // For now, we'll use the Web Audio API to generate a simple tick
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      const playTick = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      };

      // Play tick every second
      const interval = setInterval(() => {
        if (displayTime > 0 && displayTime <= 10000) {
          playTick();
        } else {
          clearInterval(interval);
        }
      }, 1000);

      // Store interval for cleanup
      audioRef.current = { interval } as any;
    } catch (error) {
      console.warn('Audio playback not supported:', error);
    }
  };

  const stopTickingSound = () => {
    if (audioRef.current && (audioRef.current as any).interval) {
      clearInterval((audioRef.current as any).interval);
      audioRef.current = null;
    }
  };

  /**
   * Format time with decisecond precision (Requirement 5.13)
   * Format: MM:SS.d where d is deciseconds (tenths of a second)
   */
  const formatTime = (ms: number): string => {
    if (ms <= 0) return '0:00.0';

    const totalSeconds = Math.floor(ms / 1000);
    const deciseconds = Math.floor((ms % 1000) / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
  };

  // Determine styling based on time remaining
  const getClockStyles = () => {
    if (displayTime <= 0) {
      return 'bg-red-600 text-white border-red-700';
    }
    
    // Visual warning at 10 seconds (Requirement 5.8)
    if (isLowTime && showWarning) {
      return 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 border-red-500 animate-pulse';
    }
    
    if (isActive) {
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-blue-500';
    }
    
    return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700';
  };

  return (
    <div
      className={`chess-clock relative ${className}`}
      data-testid="chess-clock"
      data-player-color={playerColor}
      data-is-active={isActive}
      data-is-low-time={isLowTime}
    >
      <div
        className={`
          flex items-center justify-between
          px-4 py-3 rounded-lg border-2
          transition-all duration-200
          ${getClockStyles()}
        `}
      >
        {/* Player Name */}
        {playerName && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className={`
                w-3 h-3 rounded-full flex-shrink-0
                ${playerColor === 'white' ? 'bg-white border-2 border-gray-400' : 'bg-gray-900'}
              `}
            />
            <span className="font-medium truncate text-sm">
              {playerName}
            </span>
            {timeControlDisplay && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({timeControlDisplay})
              </span>
            )}
          </div>
        )}

        {/* Time Display */}
        <div className="flex items-center gap-2">
          {/* Warning Icon */}
          {isLowTime && showWarning && displayTime > 0 && (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          
          {/* Clock Icon */}
          <Clock className="w-4 h-4 flex-shrink-0" />
          
          {/* Time with decisecond precision */}
          <span
            className={`
              font-mono font-bold text-lg tabular-nums
              ${isLowTime ? 'text-xl' : ''}
            `}
          >
            {formatTime(displayTime)}
          </span>
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}
