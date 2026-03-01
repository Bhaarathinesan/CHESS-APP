/**
 * Hook for integrating sound effects with chess game events
 * Requirements: 23.1-23.11
 */

import { useEffect, useCallback } from 'react';
import { useSoundPreferences } from './useSoundPreferences';
import { Chess, Move } from 'chess.js';

export interface ChessSoundOptions {
  game: Chess;
  timeRemaining?: number;
  isGameActive?: boolean;
}

export function useChessSound({
  game,
  timeRemaining,
  isGameActive = true,
}: ChessSoundOptions) {
  const {
    playSound,
    startLowTimeWarning,
    stopLowTimeWarning,
    resumeAudio,
  } = useSoundPreferences();

  // Handle low time warning (< 10 seconds)
  useEffect(() => {
    if (!isGameActive) {
      stopLowTimeWarning();
      return;
    }

    if (timeRemaining !== undefined && timeRemaining < 10000 && timeRemaining > 0) {
      startLowTimeWarning();
    } else {
      stopLowTimeWarning();
    }

    return () => {
      stopLowTimeWarning();
    };
  }, [timeRemaining, isGameActive, startLowTimeWarning, stopLowTimeWarning]);

  /**
   * Play sound for a chess move
   * Requirements: 23.1-23.5
   */
  const playMoveSound = useCallback(
    (move: Move | { from: string; to: string; promotion?: string; captured?: string; flags?: string }) => {
      // Resume audio context on first interaction
      resumeAudio();

      // Determine the type of move and play appropriate sound
      if ('flags' in move) {
        // chess.js Move object
        if (move.flags.includes('k') || move.flags.includes('q')) {
          // Castling (kingside or queenside)
          playSound('castling');
        } else if (move.flags.includes('c') || move.flags.includes('e')) {
          // Capture or en passant
          playSound('capture');
        } else {
          // Regular move
          playSound('move');
        }
      } else {
        // Simple move object - check if it's a capture
        if (move.captured) {
          playSound('capture');
        } else {
          playSound('move');
        }
      }

      // Check for check or checkmate after the move
      if (game.isCheckmate()) {
        playSound('checkmate');
      } else if (game.inCheck()) {
        playSound('check');
      }
    },
    [game, playSound, resumeAudio]
  );

  /**
   * Play game start sound
   * Requirements: 23.6
   */
  const playGameStart = useCallback(() => {
    resumeAudio();
    playSound('gameStart');
  }, [playSound, resumeAudio]);

  /**
   * Play game end sound
   * Requirements: 23.7
   */
  const playGameEnd = useCallback(() => {
    stopLowTimeWarning();
    playSound('gameEnd');
  }, [playSound, stopLowTimeWarning]);

  /**
   * Play notification sound
   * Requirements: 23.9
   */
  const playNotification = useCallback(() => {
    resumeAudio();
    playSound('notification');
  }, [playSound, resumeAudio]);

  /**
   * Play challenge sound
   * Requirements: 23.10
   */
  const playChallenge = useCallback(() => {
    resumeAudio();
    playSound('challenge');
  }, [playSound, resumeAudio]);

  /**
   * Play chat message sound
   * Requirements: 23.11
   */
  const playChatMessage = useCallback(() => {
    resumeAudio();
    playSound('chatMessage');
  }, [playSound, resumeAudio]);

  return {
    playMoveSound,
    playGameStart,
    playGameEnd,
    playNotification,
    playChallenge,
    playChatMessage,
  };
}
