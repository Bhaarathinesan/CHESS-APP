'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { MoveAnalysis } from '@/lib/analysis-service';
import { 
  getClassificationConfig, 
  formatCentipawns,
  formatMateScore 
} from '@/lib/move-classification';

interface MistakesBlundersListProps {
  moves: MoveAnalysis[];
  onMoveClick?: (moveIndex: number) => void;
  className?: string;
}

export const MistakesBlundersList: React.FC<MistakesBlundersListProps> = ({ 
  moves, 
  onMoveClick,
  className = '' 
}) => {
  const [filter, setFilter] = useState<'all' | 'white' | 'black'>('all');

  // Filter moves to show only mistakes and blunders
  const criticalMoves = moves
    .map((move, index) => ({ ...move, originalIndex: index }))
    .filter(move => 
      move.classification === 'mistake' || 
      move.classification === 'blunder' ||
      move.classification === 'inaccuracy'
    )
    .filter(move => {
      if (filter === 'all') return true;
      return move.color === filter;
    });

  const handleMoveClick = (moveIndex: number) => {
    if (onMoveClick) {
      onMoveClick(moveIndex);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Mistakes & Blunders</CardTitle>
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('white')}
              className={`px-3 py-1 text-xs rounded ${
                filter === 'white' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              ♔ White
            </button>
            <button
              onClick={() => setFilter('black')}
              className={`px-3 py-1 text-xs rounded ${
                filter === 'black' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              ♚ Black
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {criticalMoves.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {filter === 'all' 
                ? 'No significant mistakes found' 
                : `No mistakes found for ${filter}`}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {criticalMoves.map((move) => {
              const config = getClassificationConfig(move.classification);
              const evaluationText = move.mate !== undefined
                ? formatMateScore(move.mate)
                : formatCentipawns(move.evaluation);

              return (
                <div
                  key={move.originalIndex}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleMoveClick(move.originalIndex)}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {move.moveNumber}. {move.color === 'white' ? '♔' : '♚'} {move.san}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                        {config.label} {config.icon}
                      </span>
                    </div>
                    <span className="text-xs text-red-500 font-medium">
                      -{move.centipawnLoss} cp
                    </span>
                  </div>

                  {/* Evaluation */}
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <span>Position after move</span>
                    <span className="font-mono">{evaluationText}</span>
                  </div>

                  {/* Best Move Alternative */}
                  {move.bestMove && (
                    <div className="bg-green-500/10 rounded p-2 mt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Better:
                          </span>
                          <span className="font-mono text-sm text-green-600 dark:text-green-400 font-medium">
                            {move.bestMove}
                          </span>
                        </div>
                        {move.bestMoveEvaluation !== undefined && (
                          <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                            {formatCentipawns(move.bestMoveEvaluation)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {criticalMoves.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Inaccuracies
                </div>
                <div className="text-lg font-bold text-yellow-500">
                  {criticalMoves.filter(m => m.classification === 'inaccuracy').length}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Mistakes
                </div>
                <div className="text-lg font-bold text-orange-500">
                  {criticalMoves.filter(m => m.classification === 'mistake').length}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Blunders
                </div>
                <div className="text-lg font-bold text-red-500">
                  {criticalMoves.filter(m => m.classification === 'blunder').length}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
