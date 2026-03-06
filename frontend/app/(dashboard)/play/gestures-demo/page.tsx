'use client';

import { useState } from 'react';
import ChessBoard from '@/components/chess/ChessBoard';
import { Chess } from 'chess.js';
import { ArrowLeft, ArrowRight, ZoomIn, Hand, RefreshCw, Info } from 'lucide-react';

/**
 * Demo page for mobile gesture features
 * Showcases Requirements 21.5, 21.6, 21.7, 21.10
 */
export default function GesturesDemoPage() {
  const [game] = useState(new Chess());
  const [position, setPosition] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState<Array<{ from: string; to: string }>>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gestureLog, setGestureLog] = useState<string[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);

  const logGesture = (gesture: string) => {
    setGestureLog((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${gesture}`]);
  };

  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    try {
      game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion as 'q' | 'r' | 'b' | 'n' | undefined,
      });
      
      const newHistory = [...moveHistory, { from: move.from, to: move.to }];
      setMoveHistory(newHistory);
      setCurrentMoveIndex(newHistory.length - 1);
      setPosition(game.fen());
      logGesture(`Move: ${move.from} → ${move.to}`);
    } catch (error) {
      console.error('Invalid move:', error);
    }
  };

  const handleNavigateHistory = (direction: 'forward' | 'backward') => {
    if (direction === 'forward' && currentMoveIndex < moveHistory.length - 1) {
      const newIndex = currentMoveIndex + 1;
      setCurrentMoveIndex(newIndex);
      logGesture(`Swipe Left: Forward to move ${newIndex + 1}`);
      
      // Replay moves up to this point
      const tempGame = new Chess();
      for (let i = 0; i <= newIndex; i++) {
        tempGame.move(moveHistory[i]);
      }
      setPosition(tempGame.fen());
    } else if (direction === 'backward' && currentMoveIndex >= 0) {
      const newIndex = currentMoveIndex - 1;
      setCurrentMoveIndex(newIndex);
      logGesture(`Swipe Right: Back to move ${newIndex + 1}`);
      
      // Replay moves up to this point
      const tempGame = new Chess();
      for (let i = 0; i <= newIndex; i++) {
        tempGame.move(moveHistory[i]);
      }
      setPosition(tempGame.fen());
    }
  };

  const handleRefresh = async () => {
    logGesture('Pull-to-Refresh: Refreshing game state...');
    setRefreshCount((prev) => prev + 1);
    
    // Simulate async refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    logGesture('Pull-to-Refresh: Complete!');
  };

  const resetGame = () => {
    const newGame = new Chess();
    setPosition(newGame.fen());
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setGestureLog([]);
    setRefreshCount(0);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Mobile Gestures Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test advanced mobile gestures on touch devices
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-2">Gesture Instructions (Touch Devices Only):</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Swipe Left/Right:</strong> Navigate through move history</li>
              <li><strong>Pinch:</strong> Zoom in/out on the board (0.5x - 2.5x)</li>
              <li><strong>Long-Press:</strong> Hold a piece to see available moves</li>
              <li><strong>Pull Down:</strong> Refresh game state</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <ChessBoard
              position={position}
              onMove={handleMove}
              onNavigateHistory={handleNavigateHistory}
              onRefresh={handleRefresh}
              enableGestures={true}
              moveHistory={moveHistory}
              arePiecesDraggable={true}
            />
          </div>

          {/* Desktop Controls */}
          <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Desktop Controls
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleNavigateHistory('backward')}
                disabled={currentMoveIndex < 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous Move
              </button>
              <button
                onClick={() => handleNavigateHistory('forward')}
                disabled={currentMoveIndex >= moveHistory.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Next Move
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={resetGame}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Reset Game
              </button>
            </div>
          </div>
        </div>

        {/* Gesture Info Panel */}
        <div className="space-y-6">
          {/* Gesture Features */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Gesture Features
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ArrowLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Swipe Navigation</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Swipe left/right to navigate move history
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Requirement 21.5
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ZoomIn className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Pinch to Zoom</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pinch to zoom in/out on the board
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Requirement 21.6
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Hand className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Long Press</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Hold a piece to see move options
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Requirement 21.7
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Pull to Refresh</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Pull down to refresh game state
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Requirement 21.10
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Game Stats
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Moves:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {moveHistory.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Move:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {currentMoveIndex + 1} / {moveHistory.length || 1}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Refresh Count:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {refreshCount}
                </span>
              </div>
            </div>
          </div>

          {/* Gesture Log */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Gesture Log
            </h3>
            <div className="space-y-1">
              {gestureLog.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No gestures detected yet
                </p>
              ) : (
                gestureLog.map((log, index) => (
                  <div
                    key={index}
                    className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1"
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
