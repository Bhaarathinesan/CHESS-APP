'use client';

import React from 'react';
import { Button } from '../ui';
import { MoveAnalysis } from '@/lib/analysis-service';
import { 
  formatCentipawns, 
  formatMateScore,
  getClassificationConfig 
} from '@/lib/move-classification';

interface AnalysisNavigationProps {
  moves: MoveAnalysis[];
  currentMoveIndex: number;
  onMoveChange: (index: number) => void;
  className?: string;
}

export const AnalysisNavigation: React.FC<AnalysisNavigationProps> = ({ 
  moves, 
  currentMoveIndex,
  onMoveChange,
  className = '' 
}) => {
  const currentMove = moves[currentMoveIndex];
  const canGoBack = currentMoveIndex > 0;
  const canGoForward = currentMoveIndex < moves.length - 1;

  const handleFirst = () => {
    onMoveChange(0);
  };

  const handlePrevious = () => {
    if (canGoBack) {
      onMoveChange(currentMoveIndex - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      onMoveChange(currentMoveIndex + 1);
    }
  };

  const handleLast = () => {
    onMoveChange(moves.length - 1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handlePrevious();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === 'Home') {
      handleFirst();
    } else if (e.key === 'End') {
      handleLast();
    }
  };

  return (
    <div className={`space-y-4 ${className}`} onKeyDown={handleKeyPress} tabIndex={0}>
      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFirst}
          disabled={!canGoBack}
          title="First move (Home)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={!canGoBack}
          title="Previous move (←)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded text-sm font-medium text-gray-900 dark:text-white min-w-[100px] text-center">
          {currentMoveIndex + 1} / {moves.length}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!canGoForward}
          title="Next move (→)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLast}
          disabled={!canGoForward}
          title="Last move (End)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </Button>
      </div>

      {/* Current Move Info */}
      {currentMove && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {currentMove.moveNumber}. {currentMove.color === 'white' ? '♔' : '♚'} {currentMove.san}
              </span>
              {(() => {
                const config = getClassificationConfig(currentMove.classification);
                return (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                    {config.label} {config.icon}
                  </span>
                );
              })()}
            </div>
            <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
              {currentMove.mate !== undefined 
                ? formatMateScore(currentMove.mate)
                : formatCentipawns(currentMove.evaluation)}
            </span>
          </div>

          {/* Best Move */}
          {currentMove.bestMove && (
            <div className="space-y-2">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Engine's best move:
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2">
                <span className="font-mono text-sm text-green-600 dark:text-green-400 font-medium">
                  {currentMove.bestMove}
                </span>
                {currentMove.bestMoveEvaluation !== undefined && (
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {formatCentipawns(currentMove.bestMoveEvaluation)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Centipawn Loss */}
          {currentMove.centipawnLoss > 0 && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Centipawn loss: <span className="text-red-500 font-medium">-{currentMove.centipawnLoss}</span>
            </div>
          )}
        </div>
      )}

      {/* Move List with Evaluations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-h-64 overflow-y-auto">
        <div className="space-y-1">
          {moves.reduce<React.ReactNode[]>((acc, move, index) => {
            if (move.color === 'white') {
              // Start a new move pair
              const blackMove = moves[index + 1];
              const config = getClassificationConfig(move.classification);
              const blackConfig = blackMove ? getClassificationConfig(blackMove.classification) : null;

              acc.push(
                <div 
                  key={index}
                  className="flex items-center gap-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1"
                >
                  <span className="text-gray-500 dark:text-gray-400 w-8">
                    {move.moveNumber}.
                  </span>
                  <button
                    onClick={() => onMoveChange(index)}
                    className={`flex-1 text-left px-2 py-1 rounded ${
                      currentMoveIndex === index 
                        ? 'bg-blue-500 text-white' 
                        : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span className="font-medium">{move.san}</span>
                    {config.icon && <span className={config.color}> {config.icon}</span>}
                    <span className="text-xs ml-1 opacity-70">
                      {move.mate !== undefined 
                        ? formatMateScore(move.mate)
                        : formatCentipawns(move.evaluation)}
                    </span>
                  </button>
                  {blackMove && (
                    <button
                      onClick={() => onMoveChange(index + 1)}
                      className={`flex-1 text-left px-2 py-1 rounded ${
                        currentMoveIndex === index + 1
                          ? 'bg-blue-500 text-white' 
                          : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="font-medium">{blackMove.san}</span>
                      {blackConfig?.icon && <span className={blackConfig.color}> {blackConfig.icon}</span>}
                      <span className="text-xs ml-1 opacity-70">
                        {blackMove.mate !== undefined 
                          ? formatMateScore(blackMove.mate)
                          : formatCentipawns(blackMove.evaluation)}
                      </span>
                    </button>
                  )}
                </div>
              );
            }
            return acc;
          }, [])}
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Use arrow keys (← →) or Home/End to navigate
      </div>
    </div>
  );
};
