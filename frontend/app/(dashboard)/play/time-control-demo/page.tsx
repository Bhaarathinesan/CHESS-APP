'use client';

import { useState } from 'react';
import TimeControlSelector from '@/components/chess/TimeControlSelector';
import ChessClock from '@/components/chess/ChessClock';
import { TimeControlConfig } from '@chess-arena/shared/types/time-control.types';

/**
 * Demo page for Time Control Selector
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export default function TimeControlDemoPage() {
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlConfig | undefined>();
  const [whiteTime, setWhiteTime] = useState<number>(300000); // 5 minutes default
  const [blackTime, setBlackTime] = useState<number>(300000);
  const [activePlayer, setActivePlayer] = useState<'white' | 'black'>('white');

  const handleTimeControlChange = (timeControl: TimeControlConfig) => {
    setSelectedTimeControl(timeControl);
    // Reset clocks to new time control
    setWhiteTime(timeControl.totalTimeMs);
    setBlackTime(timeControl.totalTimeMs);
  };

  const handleSwitchPlayer = () => {
    setActivePlayer(activePlayer === 'white' ? 'black' : 'white');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Time Control Configuration Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the time control selector and chess clock integration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Time Control Selector */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Select Time Control</h2>
            <TimeControlSelector
              value={selectedTimeControl}
              onChange={handleTimeControlChange}
              allowCustom={true}
            />
          </div>

          {/* Time Control Info */}
          {selectedTimeControl && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-3">Time Control Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium">{selectedTimeControl.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Category:</span>
                  <span className="font-medium capitalize">{selectedTimeControl.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Base Time:</span>
                  <span className="font-medium">{selectedTimeControl.baseTimeMinutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Increment:</span>
                  <span className="font-medium">{selectedTimeControl.incrementSeconds} seconds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Format:</span>
                  <span className="font-medium">{selectedTimeControl.displayFormat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="font-medium">
                    {selectedTimeControl.isPredefined ? 'Predefined' : 'Custom'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chess Clocks Preview */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Chess Clocks Preview</h2>
            
            <div className="space-y-4">
              {/* Black Clock */}
              <ChessClock
                timeRemaining={blackTime}
                isActive={activePlayer === 'black'}
                playerName="Black Player"
                playerColor="black"
                timeControlDisplay={selectedTimeControl?.displayFormat}
                enableSound={true}
              />

              {/* Control Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSwitchPlayer}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Switch Player
                </button>
                <button
                  onClick={() => {
                    if (selectedTimeControl) {
                      setWhiteTime(selectedTimeControl.totalTimeMs);
                      setBlackTime(selectedTimeControl.totalTimeMs);
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  disabled={!selectedTimeControl}
                >
                  Reset Clocks
                </button>
              </div>

              {/* White Clock */}
              <ChessClock
                timeRemaining={whiteTime}
                isActive={activePlayer === 'white'}
                playerName="White Player"
                playerColor="white"
                timeControlDisplay={selectedTimeControl?.displayFormat}
                enableSound={true}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
              How to Use
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Select a predefined time control or create a custom one</li>
              <li>• Click "Switch Player" to alternate between white and black</li>
              <li>• Click "Reset Clocks" to restart with the selected time control</li>
              <li>• The active player's clock will be highlighted</li>
              <li>• Warning appears when time drops below 10 seconds</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Requirements Coverage */}
      <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Requirements Coverage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Requirement 5.1 ✓
            </div>
            <div className="text-green-800 dark:text-green-200">
              Bullet: 1+0, 1+1, 2+1
            </div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Requirement 5.2 ✓
            </div>
            <div className="text-green-800 dark:text-green-200">
              Blitz: 3+0, 3+2, 5+0, 5+3, 5+5
            </div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Requirement 5.3 ✓
            </div>
            <div className="text-green-800 dark:text-green-200">
              Rapid: 10+0, 10+5, 15+10, 15+15, 20+0
            </div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Requirement 5.4 ✓
            </div>
            <div className="text-green-800 dark:text-green-200">
              Classical: 30+0, 30+20, 45+45, 60+30, 90+30
            </div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Requirement 5.5 ✓
            </div>
            <div className="text-green-800 dark:text-green-200">
              Custom time controls with validation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
