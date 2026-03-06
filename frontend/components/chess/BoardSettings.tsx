'use client';

import { useState } from 'react';
import { Settings, X, Check, Vibrate } from 'lucide-react';
import { BOARD_THEMES, PIECE_SETS } from '@/types/chess-preferences';
import { useChessPreferences } from '@/hooks/useChessPreferences';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface BoardSettingsProps {
  onClose?: () => void;
}

/**
 * Board and piece customization settings component
 * Allows users to select board themes, piece sets, and haptic feedback
 * Requirements: 22.16, 22.17, 21.4
 */
export default function BoardSettings({ onClose }: BoardSettingsProps) {
  const { preferences, setBoardTheme, setPieceSet, resetPreferences } = useChessPreferences();
  const { isSupported: isHapticSupported, isEnabled: isHapticEnabled, setHapticEnabled, triggerHaptic } = useHapticFeedback();
  const [activeTab, setActiveTab] = useState<'board' | 'pieces' | 'preferences'>('board');

  const handleHapticToggle = () => {
    const newValue = !isHapticEnabled;
    setHapticEnabled(newValue);
    
    // Trigger a test haptic when enabling
    if (newValue && isHapticSupported) {
      triggerHaptic('MOVE');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Board Settings
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'board'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Board Themes
        </button>
        <button
          onClick={() => setActiveTab('pieces')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'pieces'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Piece Sets
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'preferences'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Preferences
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'board' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BOARD_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setBoardTheme(theme.id)}
                className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                  preferences.boardTheme === theme.id
                    ? 'border-blue-600 dark:border-blue-400 shadow-lg'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Board preview */}
                <div className="aspect-square grid grid-cols-8 grid-rows-8">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
                    return (
                      <div
                        key={i}
                        style={{
                          backgroundColor: isLight ? theme.lightSquare : theme.darkSquare,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Theme name */}
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs py-1 px-2 text-center">
                  {theme.name}
                </div>

                {/* Selected indicator */}
                {preferences.boardTheme === theme.id && (
                  <div className="absolute top-2 right-2 bg-blue-600 dark:bg-blue-400 rounded-full p-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'pieces' && (
          <div className="space-y-2">
            {PIECE_SETS.map((pieceSet) => (
              <button
                key={pieceSet.id}
                onClick={() => setPieceSet(pieceSet.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  preferences.pieceSet === pieceSet.id
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {pieceSet.name}
                    </div>
                    {pieceSet.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {pieceSet.description}
                      </div>
                    )}
                  </div>
                  {preferences.pieceSet === pieceSet.id && (
                    <div className="bg-blue-600 dark:bg-blue-400 rounded-full p-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-4">
            {/* Haptic Feedback Setting (Requirement 21.4) */}
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Vibrate className="w-5 h-5 text-gray-700 dark:text-gray-300 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Haptic Feedback
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Vibrate on piece moves, captures, and check
                    </div>
                    {!isHapticSupported && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        Not supported on this device
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleHapticToggle}
                  disabled={!isHapticSupported}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isHapticEnabled && isHapticSupported
                      ? 'bg-blue-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  } ${!isHapticSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isHapticEnabled && isHapticSupported ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Additional preferences can be added here */}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={resetPreferences}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
        >
          Reset to Default
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
