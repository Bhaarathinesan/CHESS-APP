/**
 * Move Classification Utilities
 * Provides helper functions for classifying and visualizing chess moves
 */

import { MoveClassification, MoveAnalysis } from './analysis-service';

export interface ClassificationConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

/**
 * Get configuration for a move classification
 */
export function getClassificationConfig(classification: MoveClassification): ClassificationConfig {
  const configs: Record<MoveClassification, ClassificationConfig> = {
    brilliant: {
      label: 'Brilliant',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      icon: '!!',
      description: 'An exceptional move that demonstrates deep calculation',
    },
    great: {
      label: 'Great',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      icon: '!',
      description: 'The best or near-best move in the position',
    },
    good: {
      label: 'Good',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      icon: '',
      description: 'A solid move with minimal centipawn loss',
    },
    inaccuracy: {
      label: 'Inaccuracy',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      icon: '?!',
      description: 'A suboptimal move that loses some advantage',
    },
    mistake: {
      label: 'Mistake',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      icon: '?',
      description: 'A significant error that worsens the position',
    },
    blunder: {
      label: 'Blunder',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      icon: '??',
      description: 'A major mistake that drastically changes the evaluation',
    },
  };

  return configs[classification];
}

/**
 * Get centipawn loss threshold for a classification
 */
export function getClassificationThreshold(classification: MoveClassification): number {
  const thresholds: Record<MoveClassification, number> = {
    brilliant: 0,
    great: 10,
    good: 25,
    inaccuracy: 100,
    mistake: 300,
    blunder: Infinity,
  };

  return thresholds[classification];
}

/**
 * Format centipawn score for display
 */
export function formatCentipawns(score: number): string {
  const absScore = Math.abs(score);
  
  if (absScore >= 1000) {
    // Display as pawns for large scores
    const pawns = (absScore / 100).toFixed(1);
    return score > 0 ? `+${pawns}` : `-${pawns}`;
  }
  
  // Display as centipawns
  return score > 0 ? `+${score}` : `${score}`;
}

/**
 * Format mate score for display
 */
export function formatMateScore(mate: number): string {
  if (mate > 0) {
    return `M${mate}`;
  } else {
    return `M${Math.abs(mate)}`;
  }
}

/**
 * Get evaluation bar percentage (0-100)
 */
export function getEvaluationBarPercentage(score: number, mate?: number): number {
  if (mate !== undefined) {
    // Mate scores
    return mate > 0 ? 100 : 0;
  }
  
  // Centipawn scores
  // Use a logarithmic scale for better visualization
  const maxScore = 500; // Scores beyond this are clamped
  const clampedScore = Math.max(-maxScore, Math.min(maxScore, score));
  
  // Convert to 0-100 range (50 = equal position)
  return 50 + (clampedScore / maxScore) * 50;
}

/**
 * Get win probability from centipawn evaluation
 * Based on Lichess formula
 */
export function getWinProbability(score: number, mate?: number): number {
  if (mate !== undefined) {
    return mate > 0 ? 100 : 0;
  }
  
  // Lichess formula: 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
  const probability = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score)) - 1);
  return Math.round(probability * 10) / 10;
}

/**
 * Get evaluation description
 */
export function getEvaluationDescription(score: number, mate?: number): string {
  if (mate !== undefined) {
    if (mate > 0) {
      return `White mates in ${mate}`;
    } else {
      return `Black mates in ${Math.abs(mate)}`;
    }
  }
  
  const absScore = Math.abs(score);
  
  if (absScore < 50) {
    return 'Equal position';
  } else if (absScore < 100) {
    return score > 0 ? 'White is slightly better' : 'Black is slightly better';
  } else if (absScore < 200) {
    return score > 0 ? 'White has an advantage' : 'Black has an advantage';
  } else if (absScore < 500) {
    return score > 0 ? 'White is winning' : 'Black is winning';
  } else {
    return score > 0 ? 'White is completely winning' : 'Black is completely winning';
  }
}

/**
 * Calculate accuracy from centipawn loss
 */
export function calculateAccuracyFromCentipawnLoss(centipawnLoss: number): number {
  // Formula: accuracy = 100 - (centipawn loss / 10)
  const accuracy = Math.max(0, Math.min(100, 100 - (centipawnLoss / 10)));
  return Math.round(accuracy * 10) / 10;
}

/**
 * Get accuracy color class
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 90) return 'text-green-400';
  if (accuracy >= 80) return 'text-blue-400';
  if (accuracy >= 70) return 'text-yellow-400';
  if (accuracy >= 60) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get accuracy description
 */
export function getAccuracyDescription(accuracy: number): string {
  if (accuracy >= 95) return 'Excellent';
  if (accuracy >= 90) return 'Very Good';
  if (accuracy >= 85) return 'Good';
  if (accuracy >= 80) return 'Decent';
  if (accuracy >= 70) return 'Average';
  if (accuracy >= 60) return 'Below Average';
  return 'Poor';
}

/**
 * Identify key moments in a game
 */
export function identifyKeyMoments(moves: MoveAnalysis[]): MoveAnalysis[] {
  return moves.filter(move => {
    // Key moments are blunders, mistakes, or brilliant moves
    return ['blunder', 'mistake', 'brilliant'].includes(move.classification);
  });
}

/**
 * Get move annotation symbol
 */
export function getMoveAnnotation(classification: MoveClassification): string {
  const config = getClassificationConfig(classification);
  return config.icon;
}

/**
 * Format move with annotation
 */
export function formatMoveWithAnnotation(san: string, classification: MoveClassification): string {
  const annotation = getMoveAnnotation(classification);
  return annotation ? `${san}${annotation}` : san;
}

/**
 * Calculate average centipawn loss for moves
 */
export function calculateAverageCentipawnLoss(moves: MoveAnalysis[]): number {
  if (moves.length === 0) return 0;
  
  const totalLoss = moves.reduce((sum, move) => sum + move.centipawnLoss, 0);
  return Math.round(totalLoss / moves.length);
}

/**
 * Get classification statistics
 */
export function getClassificationStats(moves: MoveAnalysis[]): Record<MoveClassification, number> {
  const stats: Record<MoveClassification, number> = {
    brilliant: 0,
    great: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
  
  moves.forEach(move => {
    stats[move.classification]++;
  });
  
  return stats;
}

/**
 * Get evaluation trend (improving, declining, stable)
 */
export function getEvaluationTrend(
  moves: MoveAnalysis[],
  color: 'white' | 'black',
  windowSize = 5
): 'improving' | 'declining' | 'stable' {
  const playerMoves = moves.filter(m => m.color === color);
  
  if (playerMoves.length < windowSize) {
    return 'stable';
  }
  
  // Compare first and last window
  const firstWindow = playerMoves.slice(0, windowSize);
  const lastWindow = playerMoves.slice(-windowSize);
  
  const firstAvgLoss = calculateAverageCentipawnLoss(firstWindow);
  const lastAvgLoss = calculateAverageCentipawnLoss(lastWindow);
  
  const difference = firstAvgLoss - lastAvgLoss;
  
  if (difference > 20) return 'improving';
  if (difference < -20) return 'declining';
  return 'stable';
}

/**
 * Get performance rating estimate based on accuracy
 */
export function estimatePerformanceRating(accuracy: number, opponentRating: number): number {
  // Rough estimate: each 1% accuracy difference = ~20 rating points
  const baseRating = opponentRating;
  const accuracyDiff = accuracy - 85; // 85% is considered "average"
  const ratingAdjustment = accuracyDiff * 20;
  
  return Math.round(baseRating + ratingAdjustment);
}

/**
 * Check if a move is critical (high centipawn loss or gain)
 */
export function isCriticalMove(move: MoveAnalysis, threshold = 200): boolean {
  return move.centipawnLoss >= threshold || 
         move.classification === 'brilliant' ||
         move.classification === 'blunder';
}

/**
 * Get move quality percentage (0-100)
 */
export function getMoveQuality(centipawnLoss: number): number {
  // Quality decreases with centipawn loss
  // 0 loss = 100% quality, 300+ loss = 0% quality
  const quality = Math.max(0, 100 - (centipawnLoss / 3));
  return Math.round(quality);
}
