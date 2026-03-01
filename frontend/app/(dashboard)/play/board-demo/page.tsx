'use client';

import { useState } from 'react';
import ChessBoard from '@/components/chess/ChessBoard';
import BoardSettingsModal from '@/components/chess/BoardSettingsModal';
import GameControls from '@/components/chess/GameControls';
import { Settings } from 'lucide-react';

/**
 * Demo page for board themes and piece sets
 * Requirements: 22.16, 22.17
 */
export default function BoardDemoPage() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Chess Board Customization
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your chess board with different themes and piece sets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chess Board */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Live Preview
              </h2>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Customize
              </button>
            </div>
            <ChessBoard
              position="start"
              orientation="white"
              arePiecesDraggable={true}
              showGameOverModal={false}
            />
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* Features Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Features
            </h3>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>6 board color themes to choose from</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>28 different piece set styles</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Preferences saved automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Instant preview of changes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Works across all devices</span>
              </li>
            </ul>
          </div>

          {/* Instructions Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              How to Use
            </h3>
            <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
              <li>Click the "Customize" button above</li>
              <li>Choose your preferred board theme</li>
              <li>Select your favorite piece set</li>
              <li>Changes apply instantly</li>
              <li>Your preferences are saved automatically</li>
            </ol>
          </div>

          {/* Game Controls Demo */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Game Controls
            </h3>
            <GameControls
              gameId="demo"
              playerId="demo-player"
              isPlayerTurn={true}
              isGameActive={true}
              onSettings={() => setShowSettings(true)}
              disabled={false}
            />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <BoardSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}
