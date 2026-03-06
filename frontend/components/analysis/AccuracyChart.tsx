'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { MoveAnalysis } from '@/lib/analysis-service';
import { getAccuracyColor, getAccuracyDescription } from '@/lib/move-classification';

interface AccuracyChartProps {
  moves: MoveAnalysis[];
  whiteAccuracy: number;
  blackAccuracy: number;
  className?: string;
}

export const AccuracyChart: React.FC<AccuracyChartProps> = ({ 
  moves, 
  whiteAccuracy, 
  blackAccuracy,
  className = '' 
}) => {
  // Calculate accuracy over time for both players
  const calculateAccuracyOverTime = (color: 'white' | 'black'): number[] => {
    const playerMoves = moves.filter(m => m.color === color);
    const accuracyPoints: number[] = [];
    
    let cumulativeLoss = 0;
    playerMoves.forEach((move, index) => {
      cumulativeLoss += move.centipawnLoss;
      const avgLoss = cumulativeLoss / (index + 1);
      const accuracy = Math.max(0, Math.min(100, 100 - (avgLoss / 10)));
      accuracyPoints.push(accuracy);
    });
    
    return accuracyPoints;
  };

  const whiteAccuracyPoints = calculateAccuracyOverTime('white');
  const blackAccuracyPoints = calculateAccuracyOverTime('black');

  // Calculate max length for chart
  const maxLength = Math.max(whiteAccuracyPoints.length, blackAccuracyPoints.length);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Accuracy Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Accuracy Summary */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              White
            </div>
            <div className={`text-3xl font-bold ${getAccuracyColor(whiteAccuracy)}`}>
              {whiteAccuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getAccuracyDescription(whiteAccuracy)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Black
            </div>
            <div className={`text-3xl font-bold ${getAccuracyColor(blackAccuracy)}`}>
              {blackAccuracy.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {getAccuracyDescription(blackAccuracy)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-48 bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 pr-2">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          {/* Chart area */}
          <div className="ml-8 h-full relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[0, 25, 50, 75, 100].map((value) => (
                <div 
                  key={value} 
                  className="border-t border-gray-300 dark:border-gray-700"
                />
              ))}
            </div>

            {/* SVG for lines */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {/* White accuracy line */}
              {whiteAccuracyPoints.length > 1 && (
                <polyline
                  points={whiteAccuracyPoints.map((acc, i) => {
                    const x = (i / (maxLength - 1)) * 100;
                    const y = 100 - acc;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(255, 255, 255)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Black accuracy line */}
              {blackAccuracyPoints.length > 1 && (
                <polyline
                  points={blackAccuracyPoints.map((acc, i) => {
                    const x = (i / (maxLength - 1)) * 100;
                    const y = 100 - acc;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="rgb(100, 100, 100)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="absolute bottom-2 right-2 flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-white" />
              <span className="text-gray-600 dark:text-gray-400">White</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-gray-600" />
              <span className="text-gray-600 dark:text-gray-400">Black</span>
            </div>
          </div>
        </div>

        {/* X-axis label */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          Move Number
        </div>
      </CardContent>
    </Card>
  );
};
