'use client';

import { useState, useCallback } from 'react';
import { getAnalysisService, GameAnalysis, AnalysisProgress } from '@/lib/analysis-service';

interface UseGameAnalysisReturn {
  analysis: GameAnalysis | null;
  isAnalyzing: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
  startAnalysis: (pgn: string) => Promise<void>;
  resetAnalysis: () => void;
}

/**
 * Hook for managing game analysis state
 */
export function useGameAnalysis(): UseGameAnalysisReturn {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(async (pgn: string) => {
    setIsAnalyzing(true);
    setProgress(null);
    setError(null);
    
    try {
      const analysisService = getAnalysisService();
      const result = await analysisService.analyzeGame(pgn, (progressUpdate) => {
        setProgress(progressUpdate);
      });
      
      setAnalysis(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze game';
      setError(errorMessage);
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  }, []);

  const resetAnalysis = useCallback(() => {
    setAnalysis(null);
    setIsAnalyzing(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    analysis,
    isAnalyzing,
    progress,
    error,
    startAnalysis,
    resetAnalysis,
  };
}
