/**
 * Chess Analysis Service
 * Provides game analysis using Stockfish engine
 * Implements position evaluation, move classification, and accuracy calculation
 */

import { Chess } from 'chess.js';
import { getStockfishWorker, StockfishEvaluation } from './stockfish-worker';

export interface MoveAnalysis {
  moveNumber: number;
  color: 'white' | 'black';
  san: string;
  uci: string;
  fen: string;
  evaluation: number; // Centipawn score from player's perspective
  mate?: number;
  classification: MoveClassification;
  centipawnLoss: number;
  bestMove?: string;
  bestMoveEvaluation?: number;
  alternativeMoves?: AlternativeMove[];
}

export type MoveClassification = 
  | 'brilliant' 
  | 'great' 
  | 'good' 
  | 'inaccuracy' 
  | 'mistake' 
  | 'blunder';

export interface AlternativeMove {
  move: string;
  evaluation: number;
  pv?: string[];
}

export interface GameAnalysis {
  moves: MoveAnalysis[];
  whiteAccuracy: number;
  blackAccuracy: number;
  openingName?: string;
  keyMoments: KeyMoment[];
  summary: AnalysisSummary;
}

export interface KeyMoment {
  moveNumber: number;
  color: 'white' | 'black';
  evaluationChange: number;
  description: string;
}

export interface AnalysisSummary {
  white: PlayerSummary;
  black: PlayerSummary;
}

export interface PlayerSummary {
  accuracy: number;
  brilliant: number;
  great: number;
  good: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  averageCentipawnLoss: number;
}

export interface AnalysisProgress {
  current: number;
  total: number;
  percentage: number;
  currentMove?: string;
}

export type AnalysisProgressCallback = (progress: AnalysisProgress) => void;

export class AnalysisService {
  private stockfish = getStockfishWorker();
  private analysisDepth = 18; // Good balance between speed and accuracy

  /**
   * Analyze a complete game
   */
  async analyzeGame(
    pgn: string,
    onProgress?: AnalysisProgressCallback
  ): Promise<GameAnalysis> {
    const chess = new Chess();
    chess.loadPgn(pgn);

    const history = chess.history({ verbose: true });
    const moves: MoveAnalysis[] = [];
    
    // Reset to start position
    chess.reset();
    
    let previousEvaluation = 0; // Starting position evaluation

    // Analyze each move
    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      
      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: history.length,
          percentage: Math.round(((i + 1) / history.length) * 100),
          currentMove: move.san,
        });
      }

      // Get position before move
      const fenBefore = chess.fen();
      
      // Evaluate position before move to find best move
      const evaluationBefore = await this.evaluatePosition(fenBefore, this.analysisDepth);
      
      // Make the move
      chess.move(move);
      const fenAfter = chess.fen();
      
      // Evaluate position after move
      const evaluationAfter = await this.evaluatePosition(fenAfter, this.analysisDepth);
      
      // Calculate centipawn loss
      const centipawnLoss = this.calculateCentipawnLoss(
        previousEvaluation,
        evaluationAfter.score,
        move.color
      );
      
      // Classify the move
      const classification = this.classifyMove(
        centipawnLoss,
        evaluationBefore.score,
        evaluationAfter.score
      );

      // Store move analysis
      moves.push({
        moveNumber: Math.floor(i / 2) + 1,
        color: move.color,
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion || ''}`,
        fen: fenAfter,
        evaluation: evaluationAfter.score,
        mate: evaluationAfter.mate,
        classification,
        centipawnLoss,
        bestMove: evaluationBefore.bestMove,
        bestMoveEvaluation: evaluationBefore.score,
      });

      previousEvaluation = evaluationAfter.score;
    }

    // Calculate accuracy for both players
    const whiteAccuracy = this.calculateAccuracy(moves, 'white');
    const blackAccuracy = this.calculateAccuracy(moves, 'black');

    // Identify key moments
    const keyMoments = this.identifyKeyMoments(moves);

    // Generate summary
    const summary = this.generateSummary(moves);

    // Try to identify opening (placeholder - would need opening database)
    const openingName = this.identifyOpening(moves);

    return {
      moves,
      whiteAccuracy,
      blackAccuracy,
      openingName,
      keyMoments,
      summary,
    };
  }

  /**
   * Evaluate a single position
   */
  async evaluatePosition(fen: string, depth?: number): Promise<StockfishEvaluation> {
    await this.stockfish.waitForReady();
    return this.stockfish.evaluatePosition(fen, depth || this.analysisDepth);
  }

  /**
   * Get best move for a position
   */
  async getBestMove(fen: string): Promise<string | undefined> {
    await this.stockfish.waitForReady();
    return this.stockfish.getBestMove(fen, this.analysisDepth);
  }

  /**
   * Analyze position with multiple variations
   */
  async analyzeWithVariations(
    fen: string,
    numVariations = 3
  ): Promise<AlternativeMove[]> {
    await this.stockfish.waitForReady();
    
    return new Promise((resolve) => {
      const variations: AlternativeMove[] = [];
      const callbackId = `variations-${Date.now()}`;
      
      this.stockfish.onEvaluation(callbackId, (evaluation) => {
        if (evaluation.bestMove && evaluation.pv) {
          variations.push({
            move: evaluation.bestMove,
            evaluation: evaluation.score,
            pv: evaluation.pv,
          });
        }
        
        if (variations.length >= numVariations) {
          this.stockfish.offEvaluation(callbackId);
          resolve(variations);
        }
      });

      this.stockfish.setPosition(fen);
      this.stockfish.analyze({ 
        depth: this.analysisDepth, 
        multiPV: numVariations 
      });

      // Timeout after 15 seconds
      setTimeout(() => {
        this.stockfish.offEvaluation(callbackId);
        resolve(variations);
      }, 15000);
    });
  }

  /**
   * Calculate centipawn loss for a move
   */
  private calculateCentipawnLoss(
    evaluationBefore: number,
    evaluationAfter: number,
    color: 'w' | 'b'
  ): number {
    // Flip evaluation for black
    const beforeFromPlayerPerspective = color === 'w' ? evaluationBefore : -evaluationBefore;
    const afterFromPlayerPerspective = color === 'w' ? -evaluationAfter : evaluationAfter;
    
    const loss = beforeFromPlayerPerspective - afterFromPlayerPerspective;
    return Math.max(0, loss);
  }

  /**
   * Classify a move based on centipawn loss
   */
  private classifyMove(
    centipawnLoss: number,
    evaluationBefore: number,
    evaluationAfter: number
  ): MoveClassification {
    // Brilliant: Best move in a complex position or sacrificial move that leads to advantage
    if (centipawnLoss === 0 && Math.abs(evaluationBefore) > 200) {
      return 'brilliant';
    }
    
    // Great: Best move or very close to best (< 10 cp loss)
    if (centipawnLoss < 10) {
      return 'great';
    }
    
    // Good: Small inaccuracy (10-25 cp loss)
    if (centipawnLoss < 25) {
      return 'good';
    }
    
    // Inaccuracy: Noticeable mistake (25-100 cp loss)
    if (centipawnLoss < 100) {
      return 'inaccuracy';
    }
    
    // Mistake: Significant error (100-300 cp loss)
    if (centipawnLoss < 300) {
      return 'mistake';
    }
    
    // Blunder: Major error (300+ cp loss)
    return 'blunder';
  }

  /**
   * Calculate accuracy percentage for a player
   */
  private calculateAccuracy(moves: MoveAnalysis[], color: 'white' | 'black'): number {
    const playerMoves = moves.filter(m => m.color === color);
    
    if (playerMoves.length === 0) return 100;

    // Calculate accuracy based on centipawn loss
    // Formula: accuracy = 100 - (average centipawn loss / 10)
    const totalCentipawnLoss = playerMoves.reduce((sum, move) => sum + move.centipawnLoss, 0);
    const averageCentipawnLoss = totalCentipawnLoss / playerMoves.length;
    
    // Cap accuracy between 0 and 100
    const accuracy = Math.max(0, Math.min(100, 100 - (averageCentipawnLoss / 10)));
    
    return Math.round(accuracy * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Identify key moments where evaluation changed significantly
   */
  private identifyKeyMoments(moves: MoveAnalysis[]): KeyMoment[] {
    const keyMoments: KeyMoment[] = [];
    
    for (let i = 1; i < moves.length; i++) {
      const currentMove = moves[i];
      const previousMove = moves[i - 1];
      
      const evaluationChange = Math.abs(currentMove.evaluation - previousMove.evaluation);
      
      // Key moment if evaluation changed by more than 200 centipawns
      if (evaluationChange > 200) {
        keyMoments.push({
          moveNumber: currentMove.moveNumber,
          color: currentMove.color,
          evaluationChange,
          description: this.describeKeyMoment(currentMove, previousMove),
        });
      }
    }
    
    return keyMoments;
  }

  /**
   * Describe a key moment
   */
  private describeKeyMoment(currentMove: MoveAnalysis, previousMove: MoveAnalysis): string {
    const change = currentMove.evaluation - previousMove.evaluation;
    
    if (currentMove.classification === 'blunder') {
      return `${currentMove.color === 'white' ? 'White' : 'Black'} blundered with ${currentMove.san}`;
    }
    
    if (currentMove.classification === 'brilliant') {
      return `${currentMove.color === 'white' ? 'White' : 'Black'} found brilliant ${currentMove.san}`;
    }
    
    if (Math.abs(change) > 500) {
      return `Game-changing moment: ${currentMove.san}`;
    }
    
    return `Significant evaluation shift after ${currentMove.san}`;
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(moves: MoveAnalysis[]): AnalysisSummary {
    const whiteMoves = moves.filter(m => m.color === 'white');
    const blackMoves = moves.filter(m => m.color === 'black');
    
    return {
      white: this.generatePlayerSummary(whiteMoves),
      black: this.generatePlayerSummary(blackMoves),
    };
  }

  /**
   * Generate summary for a single player
   */
  private generatePlayerSummary(moves: MoveAnalysis[]): PlayerSummary {
    const classifications = {
      brilliant: 0,
      great: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };
    
    let totalCentipawnLoss = 0;
    
    moves.forEach(move => {
      classifications[move.classification]++;
      totalCentipawnLoss += move.centipawnLoss;
    });
    
    const averageCentipawnLoss = moves.length > 0 
      ? Math.round(totalCentipawnLoss / moves.length) 
      : 0;
    
    const accuracy = this.calculateAccuracy(moves, moves[0]?.color || 'white');
    
    return {
      accuracy,
      brilliant: classifications.brilliant,
      great: classifications.great,
      good: classifications.good,
      inaccuracies: classifications.inaccuracy,
      mistakes: classifications.mistake,
      blunders: classifications.blunder,
      averageCentipawnLoss,
    };
  }

  /**
   * Identify opening using opening database
   */
  private identifyOpening(moves: MoveAnalysis[]): string | undefined {
    if (moves.length < 2) return undefined;
    
    // Import opening database dynamically to avoid circular dependencies
    const { getOpeningName } = require('./opening-database');
    
    // Get first 12 moves (6 for each side) for opening identification
    const openingMoves = moves.slice(0, 12).map(m => m.san);
    
    return getOpeningName(openingMoves);
  }

  /**
   * Set analysis depth (higher = more accurate but slower)
   */
  setDepth(depth: number): void {
    this.analysisDepth = Math.max(10, Math.min(30, depth));
  }

  /**
   * Get current analysis depth
   */
  getDepth(): number {
    return this.analysisDepth;
  }
}

// Singleton instance
let analysisServiceInstance: AnalysisService | null = null;

/**
 * Get or create analysis service instance
 */
export function getAnalysisService(): AnalysisService {
  if (!analysisServiceInstance) {
    analysisServiceInstance = new AnalysisService();
  }
  return analysisServiceInstance;
}
