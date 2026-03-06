'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { MoveAnalysis, MoveClassification } from '@/lib/analysis-service';
import { 
  getClassificationConfig, 
  formatCentipawns, 
  formatMateScore,
  getEvaluationDescription 
} from '@/lib/move-classification';

interface AnalysisPanelProps {
  currentMove?: MoveAnalysis;
  className?: string;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ 
  currentMove, 
  className = '' 
}) => {
  if (!currentMove) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Select a move to view analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  const config = getClassificationConfig(currentMove.classification);
  const evaluationText = currentMove.mate !== undefined
    ? formatMateScore(currentMove.mate)
    : formatCentipawns(currentMove.evaluation);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Evaluation Bar */}
        <EvaluationBar 
          evaluation={currentMove.evaluation} 
          mate={currentMove.mate}
        />

        {/* Current Position Evaluation */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Position Evaluation
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {evaluationText}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {getEvaluationDescription(currentMove.evaluation, currentMove.mate)}
          </p>
        </div>

        {/* Move Classification */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Move Quality
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
              {config.label} {config.icon}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {config.description}
          </p>
        </div>

        {/* Centipawn Loss */}
        {currentMove.centipawnLoss > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Centipawn Loss
              </span>
              <span className="text-sm font-medium text-red-500">
                -{currentMove.centipawnLoss}
              </span>
            </div>
          </div>
        )}

        {/* Best Move Suggestion */}
        {currentMove.bestMove && currentMove.classification !== 'brilliant' && currentMove.classification !== 'great' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Best Move
            </h4>
            <div className="flex items-center justify-between bg-green-500/10 rounded-lg p-3">
              <span className="font-mono text-sm text-green-600 dark:text-green-400">
                {currentMove.bestMove}
              </span>
              {currentMove.bestMoveEvaluation !== undefined && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatCentipawns(currentMove.bestMoveEvaluation)}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface EvaluationBarProps {
  evaluation: number;
  mate?: number;
  className?: string;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({ 
  evaluation, 
  mate,
  className = '' 
}) => {
  // Calculate percentage for white (0-100)
  const getPercentage = (): number => {
    if (mate !== undefined) {
      return mate > 0 ? 100 : 0;
    }
    
    // Use logarithmic scale for better visualization
    const maxScore = 500;
    const clampedScore = Math.max(-maxScore, Math.min(maxScore, evaluation));
    return 50 + (clampedScore / maxScore) * 50;
  };

  const percentage = getPercentage();
  const evaluationText = mate !== undefined 
    ? formatMateScore(mate) 
    : formatCentipawns(evaluation);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          White
        </span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Black
        </span>
      </div>
      <div className="relative h-8 bg-gray-900 rounded-lg overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-white transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${
            percentage > 50 ? 'text-gray-900' : 'text-white'
          }`}>
            {evaluationText}
          </span>
        </div>
      </div>
    </div>
  );
};
