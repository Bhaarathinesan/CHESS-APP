'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Flag, Handshake, Settings, X, Clock } from 'lucide-react';

export interface GameControlsProps {
  gameId: string;
  playerId: string;
  isPlayerTurn: boolean;
  isGameActive: boolean;
  onResign?: () => void;
  onOfferDraw?: () => void;
  onAcceptDraw?: () => void;
  onDeclineDraw?: () => void;
  onCancelDrawOffer?: () => void;
  onSettings?: () => void;
  drawOfferState?: {
    hasOffer: boolean;
    isOffering: boolean; // true if current player offered
    offeringPlayerId?: string;
    expiresAt?: number;
  };
  disabled?: boolean;
}

/**
 * GameControls component for chess game actions
 * Features:
 * - Resign button (Requirement 4.10)
 * - Offer Draw button (Requirement 4.10)
 * - Accept/Decline Draw buttons (Requirement 4.11)
 * - Settings button
 * - Button states and permissions
 * - Draw offer countdown timer
 */
export default function GameControls({
  gameId,
  playerId,
  isPlayerTurn,
  isGameActive,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onCancelDrawOffer,
  onSettings,
  drawOfferState,
  disabled = false,
}: GameControlsProps) {
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Update countdown timer for draw offer expiration
  useEffect(() => {
    if (drawOfferState?.hasOffer && drawOfferState?.expiresAt) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, drawOfferState.expiresAt! - now);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          setTimeRemaining(null);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 100);

      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [drawOfferState]);

  const handleResignClick = () => {
    setShowResignConfirm(true);
  };

  const handleConfirmResign = () => {
    setShowResignConfirm(false);
    onResign?.();
  };

  const handleCancelResign = () => {
    setShowResignConfirm(false);
  };

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  };

  const isDisabled = disabled || !isGameActive;

  return (
    <div className="game-controls w-full">
      {/* Draw Offer Notification */}
      {drawOfferState?.hasOffer && !drawOfferState.isOffering && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Draw Offered
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your opponent has offered a draw
                </p>
              </div>
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onAcceptDraw}
              disabled={isDisabled}
              className="flex-1"
            >
              Accept Draw
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeclineDraw}
              disabled={isDisabled}
              className="flex-1"
            >
              Decline
            </Button>
          </div>
        </div>
      )}

      {/* Draw Offer Sent Notification */}
      {drawOfferState?.hasOffer && drawOfferState.isOffering && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Draw Offer Sent
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Waiting for opponent's response
                </p>
              </div>
            </div>
            {timeRemaining !== null && (
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatTime(timeRemaining)}</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancelDrawOffer}
            disabled={isDisabled}
            className="w-full"
          >
            Cancel Offer
          </Button>
        </div>
      )}

      {/* Main Control Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Resign Button */}
        <Button
          variant="outline"
          size="md"
          onClick={handleResignClick}
          disabled={isDisabled}
          className="flex-1 min-w-[120px] border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <Flag className="w-4 h-4 mr-2" />
          Resign
        </Button>

        {/* Offer Draw Button */}
        <Button
          variant="outline"
          size="md"
          onClick={onOfferDraw}
          disabled={isDisabled || drawOfferState?.hasOffer}
          className="flex-1 min-w-[120px]"
        >
          <Handshake className="w-4 h-4 mr-2" />
          Offer Draw
        </Button>

        {/* Settings Button */}
        <Button
          variant="ghost"
          size="md"
          onClick={onSettings}
          className="px-3"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Resign Confirmation Modal */}
      {showResignConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirm Resignation
              </h3>
              <button
                onClick={handleCancelResign}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to resign? This will end the game and you will lose.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={handleCancelResign}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmResign}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                Resign
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
