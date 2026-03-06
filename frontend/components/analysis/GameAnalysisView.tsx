'use client';

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import ChessBoard from '../chess/ChessBoard';
import { Button, Spinner } from '../ui';
import { AnalysisPanel } from './AnalysisPanel';
import { AccuracyChart } from './AccuracyChart';
import { WinProbabilityGraph } from './WinProbabilityGraph';
import { MistakesBlundersList } from './MistakesBlundersList';
import { AnalysisNavigation } from './AnalysisNavigation';
import { AnalysisExport } from './AnalysisExport';
import { getAnalysisService, GameAnalysis, AnalysisProgress } from '@/lib/analysis-service';

interface GameAnalysisViewProps {
  pgn: string;
  whitePlayer: string;
  blackPlayer: string;
  result?: string;
  date?: string;
  className?: string;
}

export const GameAnalysisView: React.FC<GameAnalysisViewProps> = ({ 
  pgn,
  whitePlayer,
  blackPlayer,
  result,
  date,
  className = '' 
}) => {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [chess] = useState(() => new Chess());
  const [boardPosition, setBoardPosition] = useState(chess.fen());

  // Start analysis on mount
  useEffect(() => {
    startAnalysis();
  }, [pgn]);

  // Update board position when move index changes
  useEffect(() => {
    if (analysis) {
      chess.reset();
      for (let i = 0; i <= currentMoveIndex; i++) {
        const move = analysis.moves[i];
        if (move) {
          chess.move(move.uci);
        }
      }
      setBoardPosition(chess.fen());
    }
  }, [currentMoveIndex, analysis]);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(null);
    
    try {
      const analysisService = getAnalysisService();
      const result = await analysisService.analyzeGame(pgn, (progress) => {
        setAnalysisProgress(progress);
      });
      
      setAnalysis(result);
      setCurrentMoveIndex(result.moves.length - 1); // Start at the end
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Failed to analyze game. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const handleMoveChange = (index: number) => {
    setCurrentMoveIndex(index);
  };

  if (isAnalyzing) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[600px] ${className}`}>
        <Spinner />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4">
          Analyzing Game...
        </h3>
        {analysisProgress && (
          <div className="mt-4 w-full max-w-md">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Move {analysisProgress.current} of {analysisProgress.total}</span>
              <span>{analysisProgress.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress.percentage}%` }}
              />
            </div>
            {analysisProgress.currentMove && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                Analyzing: {analysisProgress.currentMove}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[600px] ${className}`}>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No analysis available
        </p>
        <Button onClick={startAnalysis}>
          Start Analysis
        </Button>
      </div>
    );
  }

  const currentMove = analysis.moves[currentMoveIndex];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Game Analysis
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {whitePlayer} vs {blackPlayer}
            {result && ` • ${result}`}
            {date && ` • ${date}`}
          </p>
        </div>
        <AnalysisExport
          analysis={analysis}
          gamePgn={pgn}
          whitePlayer={whitePlayer}
          blackPlayer={blackPlayer}
          result={result}
          date={date}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Board and Navigation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chess Board */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <ChessBoard
              position={boardPosition}
              arePiecesDraggable={false}
              boardWidth={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 100 : 600)}
            />
          </div>

          {/* Navigation */}
          <AnalysisNavigation
            moves={analysis.moves}
            currentMoveIndex={currentMoveIndex}
            onMoveChange={handleMoveChange}
          />
        </div>

        {/* Right Column - Analysis Panel */}
        <div className="space-y-4">
          <AnalysisPanel currentMove={currentMove} />
        </div>
      </div>

      {/* Charts and Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccuracyChart
          moves={analysis.moves}
          whiteAccuracy={analysis.whiteAccuracy}
          blackAccuracy={analysis.blackAccuracy}
        />
        <WinProbabilityGraph
          moves={analysis.moves}
          keyMoments={analysis.keyMoments}
          onMoveClick={handleMoveChange}
          currentMoveIndex={currentMoveIndex}
        />
      </div>

      {/* Mistakes and Blunders */}
      <MistakesBlundersList
        moves={analysis.moves}
        onMoveClick={handleMoveChange}
      />

      {/* Opening Information */}
      {analysis.openingName && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Opening
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {analysis.openingName}
          </p>
        </div>
      )}

      {/* Re-analyze Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={startAnalysis}
          disabled={isAnalyzing}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-analyze Game
        </Button>
      </div>
    </div>
  );
};
