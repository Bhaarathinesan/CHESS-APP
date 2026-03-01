'use client';

import { Clock } from 'lucide-react';
import { useState } from 'react';

export interface Move {
  moveNumber: number;
  white?: {
    san: string;
    timestamp?: number;
  };
  black?: {
    san: string;
    timestamp?: number;
  };
}

export interface MoveListProps {
  moves: Move[];
  currentMoveIndex?: number;
  onMoveClick?: (moveIndex: number) => void;
  showTimestamps?: boolean;
  useFigurineNotation?: boolean;
}

/**
 * MoveList component displays chess moves in Standard Algebraic Notation (SAN)
 * Supports figurine notation, timestamps, and navigation through move history
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export default function MoveList({
  moves,
  currentMoveIndex,
  onMoveClick,
  showTimestamps = false,
  useFigurineNotation = false,
}: MoveListProps) {
  const [hoveredMove, setHoveredMove] = useState<number | null>(null);

  // Convert SAN notation to figurine notation
  const toFigurineNotation = (san: string): string => {
    if (!useFigurineNotation) return san;

    const pieceMap: Record<string, string> = {
      K: '♔',
      Q: '♕',
      R: '♖',
      B: '♗',
      N: '♘',
    };

    let result = san;
    for (const [letter, symbol] of Object.entries(pieceMap)) {
      result = result.replace(new RegExp(letter, 'g'), symbol);
    }
    return result;
  };

  // Format timestamp to display
  const formatTimestamp = (timestamp?: number): string => {
    if (!timestamp) return '';
    const seconds = Math.floor(timestamp / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate move index for navigation
  const getMoveIndex = (moveNumber: number, color: 'white' | 'black'): number => {
    return (moveNumber - 1) * 2 + (color === 'white' ? 0 : 1);
  };

  const handleMoveClick = (moveNumber: number, color: 'white' | 'black') => {
    if (onMoveClick) {
      const index = getMoveIndex(moveNumber, color);
      onMoveClick(index);
    }
  };

  return (
    <div className="move-list w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Move List</h3>
        {showTimestamps && (
          <Clock className="w-4 h-4 text-foreground-secondary" />
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto border border-border rounded-lg">
        {moves.length === 0 ? (
          <div className="p-4 text-center text-sm text-foreground-secondary">
            No moves yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {moves.map((move) => (
              <div
                key={move.moveNumber}
                className="grid grid-cols-[40px_1fr_1fr] gap-2 p-2 hover:bg-background-secondary transition-colors"
              >
                {/* Move number */}
                <div className="text-sm font-medium text-foreground-secondary flex items-center">
                  {move.moveNumber}.
                </div>

                {/* White's move */}
                <div className="flex flex-col">
                  {move.white && (
                    <>
                      <button
                        onClick={() => handleMoveClick(move.moveNumber, 'white')}
                        onMouseEnter={() =>
                          setHoveredMove(getMoveIndex(move.moveNumber, 'white'))
                        }
                        onMouseLeave={() => setHoveredMove(null)}
                        className={`text-left text-sm font-mono px-2 py-1 rounded transition-colors ${
                          currentMoveIndex === getMoveIndex(move.moveNumber, 'white')
                            ? 'bg-primary text-primary-foreground'
                            : hoveredMove === getMoveIndex(move.moveNumber, 'white')
                            ? 'bg-background-tertiary'
                            : ''
                        }`}
                      >
                        {toFigurineNotation(move.white.san)}
                      </button>
                      {showTimestamps && move.white.timestamp && (
                        <span className="text-xs text-foreground-secondary px-2">
                          {formatTimestamp(move.white.timestamp)}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Black's move */}
                <div className="flex flex-col">
                  {move.black && (
                    <>
                      <button
                        onClick={() => handleMoveClick(move.moveNumber, 'black')}
                        onMouseEnter={() =>
                          setHoveredMove(getMoveIndex(move.moveNumber, 'black'))
                        }
                        onMouseLeave={() => setHoveredMove(null)}
                        className={`text-left text-sm font-mono px-2 py-1 rounded transition-colors ${
                          currentMoveIndex === getMoveIndex(move.moveNumber, 'black')
                            ? 'bg-primary text-primary-foreground'
                            : hoveredMove === getMoveIndex(move.moveNumber, 'black')
                            ? 'bg-background-tertiary'
                            : ''
                        }`}
                      >
                        {toFigurineNotation(move.black.san)}
                      </button>
                      {showTimestamps && move.black.timestamp && (
                        <span className="text-xs text-foreground-secondary px-2">
                          {formatTimestamp(move.black.timestamp)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
