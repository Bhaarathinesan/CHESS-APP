'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { MoveAnalysis, KeyMoment } from '@/lib/analysis-service';
import { getWinProbability } from '@/lib/move-classification';

interface WinProbabilityGraphProps {
  moves: MoveAnalysis[];
  keyMoments: KeyMoment[];
  onMoveClick?: (moveIndex: number) => void;
  currentMoveIndex?: number;
  className?: string;
}

export const WinProbabilityGraph: React.FC<WinProbabilityGraphProps> = ({ 
  moves, 
  keyMoments,
  onMoveClick,
  currentMoveIndex,
  className = '' 
}) => {
  const [hoveredMove, setHoveredMove] = useState<number | null>(null);

  // Calculate win probability for each move
  const winProbabilities = moves.map(move => 
    getWinProbability(move.evaluation, move.mate)
  );

  // Find key moment indices
  const keyMomentIndices = new Set(
    keyMoments.map(km => {
      // Find the move index for this key moment
      return moves.findIndex(m => 
        m.moveNumber === km.moveNumber && m.color === km.color
      );
    }).filter(idx => idx !== -1)
  );

  const handlePointClick = (index: number) => {
    if (onMoveClick) {
      onMoveClick(index);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Win Probability</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="relative h-64 bg-gradient-to-b from-white/10 via-gray-500/10 to-gray-900/10 dark:from-white/5 dark:via-gray-500/5 dark:to-gray-900/5 rounded-lg p-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          {/* Chart area */}
          <div className="ml-10 h-full relative">
            {/* 50% line (equal position) */}
            <div className="absolute left-0 right-0 border-t-2 border-dashed border-gray-400 dark:border-gray-600" style={{ top: '50%' }} />

            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 25, 50, 75, 100].map((value) => (
                <div 
                  key={value} 
                  className="border-t border-gray-300 dark:border-gray-700"
                />
              ))}
            </div>

            {/* SVG for graph */}
            <svg 
              className="absolute inset-0 w-full h-full cursor-pointer" 
              preserveAspectRatio="none"
              onMouseLeave={() => setHoveredMove(null)}
            >
              {/* Area fill */}
              <defs>
                <linearGradient id="winGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(255, 255, 255)" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="rgb(156, 163, 175)" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="rgb(0, 0, 0)" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Fill area under curve */}
              {winProbabilities.length > 1 && (
                <polygon
                  points={`
                    0,100
                    ${winProbabilities.map((prob, i) => {
                      const x = (i / (winProbabilities.length - 1)) * 100;
                      const y = 100 - prob;
                      return `${x},${y}`;
                    }).join(' ')}
                    100,100
                  `}
                  fill="url(#winGradient)"
                />
              )}

              {/* Win probability line */}
              {winProbabilities.length > 1 && (
                <polyline
                  points={winProbabilities.map((prob, i) => {
                    const x = (i / (winProbabilities.length - 1)) * 100;
                    const y = 100 - prob;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Key moment markers */}
              {winProbabilities.map((prob, i) => {
                const isKeyMoment = keyMomentIndices.has(i);
                const isCurrentMove = currentMoveIndex === i;
                const isHovered = hoveredMove === i;
                
                if (!isKeyMoment && !isCurrentMove && !isHovered) return null;

                const x = (i / (winProbabilities.length - 1)) * 100;
                const y = 100 - prob;

                return (
                  <g key={i}>
                    <circle
                      cx={`${x}%`}
                      cy={`${y}%`}
                      r={isCurrentMove ? "6" : isKeyMoment ? "5" : "4"}
                      fill={isCurrentMove ? "rgb(59, 130, 246)" : isKeyMoment ? "rgb(239, 68, 68)" : "rgb(156, 163, 175)"}
                      stroke="white"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onClick={() => handlePointClick(i)}
                      onMouseEnter={() => setHoveredMove(i)}
                    />
                    {isKeyMoment && (
                      <text
                        x={`${x}%`}
                        y={`${y - 8}%`}
                        textAnchor="middle"
                        className="text-xs fill-red-500 font-bold"
                        style={{ fontSize: '10px' }}
                      >
                        !
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Hover tooltip */}
            {hoveredMove !== null && (
              <div 
                className="absolute bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none z-10"
                style={{
                  left: `${(hoveredMove / (winProbabilities.length - 1)) * 100}%`,
                  top: `${100 - winProbabilities[hoveredMove]}%`,
                  transform: 'translate(-50%, -120%)'
                }}
              >
                <div>Move {moves[hoveredMove].moveNumber}</div>
                <div>{winProbabilities[hoveredMove].toFixed(1)}% White</div>
              </div>
            )}
          </div>
        </div>

        {/* X-axis label */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          Move Number
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600 dark:text-gray-400">Current Position</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600 dark:text-gray-400">Key Moment</span>
          </div>
        </div>

        {/* Key Moments List */}
        {keyMoments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Key Moments
            </h4>
            <div className="space-y-2">
              {keyMoments.slice(0, 5).map((moment, index) => {
                const moveIndex = moves.findIndex(m => 
                  m.moveNumber === moment.moveNumber && m.color === moment.color
                );
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-2"
                    onClick={() => moveIndex !== -1 && handlePointClick(moveIndex)}
                  >
                    <span className="text-gray-600 dark:text-gray-400">
                      Move {moment.moveNumber}. {moment.color === 'white' ? '♔' : '♚'}
                    </span>
                    <span className="text-gray-900 dark:text-white text-xs">
                      {moment.description}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
