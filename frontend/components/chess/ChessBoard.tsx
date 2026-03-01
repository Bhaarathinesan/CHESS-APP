'use client';

import { Chessboard } from 'react-chessboard';
import { Chess, Square, Move } from 'chess.js';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Crown, Castle, Shield, Swords, X } from 'lucide-react';
import { useChessPreferences } from '@/hooks/useChessPreferences';
import { BOARD_THEMES } from '@/types/chess-preferences';

export type BoardOrientation = 'white' | 'black';
export type GameResult = 'checkmate' | 'stalemate' | 'draw' | 'resignation' | 'timeout';

export interface ChessBoardProps {
  position?: string; // FEN string
  orientation?: BoardOrientation;
  onMove?: (move: { from: string; to: string; promotion?: string }) => void;
  onGameOver?: (result: GameResult, winner?: 'white' | 'black') => void;
  boardWidth?: number;
  arePiecesDraggable?: boolean;
  showGameOverModal?: boolean;
  onRematch?: () => void;
  onNewGame?: () => void;
  requireMoveConfirmation?: boolean; // Show confirmation dialog before completing moves (for touch devices)
}

/**
 * ChessBoard wrapper component for react-chessboard
 * Provides move validation using chess.js and custom styling
 * Features:
 * - Drag-and-drop piece movement (Requirement 21.2)
 * - Tap-tap (click-click) piece movement (Requirement 21.2)
 * - Legal move highlights with dots for empty squares and circles for captures (Requirement 21.2)
 * - Move confirmation dialog for touch devices (Requirement 21.3)
 * - Pawn promotion dialog with 30s auto-promote (Requirements 3.12, 3.13)
 * - Last move highlight (yellow/blue)
 * - Check indicator (red highlight on king)
 * - Game over modal (checkmate/stalemate/draw)
 * - Customizable board themes (Requirement 22.16)
 * - Customizable piece sets (Requirement 22.17)
 */
export default function ChessBoard({
  position = 'start',
  orientation = 'white',
  onMove,
  onGameOver,
  boardWidth,
  arePiecesDraggable = true,
  showGameOverModal = true,
  onRematch,
  onNewGame,
  requireMoveConfirmation = false,
}: ChessBoardProps) {
  const [game, setGame] = useState<Chess>(new Chess());
  const [currentPosition, setCurrentPosition] = useState(position);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [promotionMove, setPromotionMove] = useState<{ from: Square; to: Square } | null>(null);
  const [gameOver, setGameOver] = useState<{ result: GameResult; winner?: 'white' | 'black' } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ from: Square; to: Square } | null>(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  
  const promotionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { preferences } = useChessPreferences();

  // Update game when position prop changes
  useEffect(() => {
    const newGame = new Chess();
    if (position !== 'start') {
      try {
        newGame.load(position);
        setCurrentPosition(newGame.fen());
      } catch (error) {
        console.error('Invalid FEN position:', error);
      }
    } else {
      setCurrentPosition(newGame.fen());
    }
    setGame(newGame);
  }, [position]);

  // Check for game over conditions
  useEffect(() => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'black' : 'white';
      setGameOver({ result: 'checkmate', winner });
      onGameOver?.('checkmate', winner);
    } else if (game.isStalemate()) {
      setGameOver({ result: 'stalemate' });
      onGameOver?.('stalemate');
    } else if (game.isDraw()) {
      setGameOver({ result: 'draw' });
      onGameOver?.('draw');
    }
  }, [currentPosition, game, onGameOver]);

  // Clear promotion timer on unmount
  useEffect(() => {
    return () => {
      if (promotionTimerRef.current) {
        clearTimeout(promotionTimerRef.current);
      }
    };
  }, []);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (!arePiecesDraggable) return;

      // If a square is already selected
      if (selectedSquare) {
        // Try to make a move
        const moves = game.moves({ square: selectedSquare, verbose: true }) as Move[];
        const targetMove = moves.find((m) => m.to === square);

        if (targetMove) {
          // Check if it's a promotion move
          if (targetMove.promotion) {
            setPromotionMove({ from: selectedSquare, to: square });
            setShowPromotionDialog(true);
            
            // Auto-promote to queen after 30 seconds (Requirement 3.13)
            promotionTimerRef.current = setTimeout(() => {
              handlePromotion('q');
            }, 30000);
          } else if (requireMoveConfirmation) {
            // Show move confirmation dialog for touch devices (Requirement 21.3)
            setPendingMove({ from: selectedSquare, to: square });
            setShowMoveConfirmation(true);
          } else {
            makeMove(selectedSquare, square);
          }
        } else {
          // Select new square if it has a piece
          const piece = game.get(square);
          if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true }) as Move[];
            setLegalMoves(moves.map((m) => m.to as Square));
          } else {
            setSelectedSquare(null);
            setLegalMoves([]);
          }
        }
      } else {
        // Select square if it has a piece of the current player
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          setSelectedSquare(square);
          const moves = game.moves({ square, verbose: true }) as Move[];
          setLegalMoves(moves.map((m) => m.to as Square));
        }
      }
    },
    [selectedSquare, game, arePiecesDraggable, requireMoveConfirmation]
  );

  const makeMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      try {
        const move = game.move({
          from,
          to,
          promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
        });

        if (move === null) return false;

        // Update state
        const newFen = game.fen();
        setCurrentPosition(newFen);
        setLastMove({ from, to });
        setSelectedSquare(null);
        setLegalMoves([]);

        // Call the onMove callback
        if (onMove) {
          onMove({
            from,
            to,
            promotion: move.promotion,
          });
        }

        return true;
      } catch (error) {
        console.error('Move error:', error);
        return false;
      }
    },
    [game, onMove]
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      const from = sourceSquare as Square;
      const to = targetSquare as Square;

      // Check if it's a promotion move
      const moves = game.moves({ square: from, verbose: true }) as Move[];
      const targetMove = moves.find((m) => m.to === to);

      if (targetMove && targetMove.promotion) {
        setPromotionMove({ from, to });
        setShowPromotionDialog(true);
        
        // Auto-promote to queen after 30 seconds
        promotionTimerRef.current = setTimeout(() => {
          handlePromotion('q');
        }, 30000);
        
        return false; // Don't complete the move yet
      }

      // Show confirmation dialog for touch devices if required
      if (requireMoveConfirmation) {
        setPendingMove({ from, to });
        setShowMoveConfirmation(true);
        return false; // Don't complete the move yet
      }

      return makeMove(from, to);
    },
    [game, makeMove, requireMoveConfirmation]
  );

  const handlePromotion = useCallback(
    (piece: 'q' | 'r' | 'b' | 'n') => {
      if (promotionTimerRef.current) {
        clearTimeout(promotionTimerRef.current);
        promotionTimerRef.current = null;
      }

      if (promotionMove) {
        makeMove(promotionMove.from, promotionMove.to, piece);
        setShowPromotionDialog(false);
        setPromotionMove(null);
      }
    },
    [promotionMove, makeMove]
  );

  const handleConfirmMove = useCallback(() => {
    if (pendingMove) {
      makeMove(pendingMove.from, pendingMove.to);
      setShowMoveConfirmation(false);
      setPendingMove(null);
    }
  }, [pendingMove, makeMove]);

  const handleCancelMove = useCallback(() => {
    setShowMoveConfirmation(false);
    setPendingMove(null);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  // Get custom square styles for highlights
  const getCustomSquareStyles = useCallback(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Last move highlight (yellow/blue)
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };
      styles[lastMove.to] = { backgroundColor: 'rgba(155, 199, 0, 0.6)' };
    }

    // Check indicator (red highlight on king)
    if (game.inCheck()) {
      const turn = game.turn();
      const kingSquare = game.board().flat().find(
        (piece) => piece && piece.type === 'k' && piece.color === turn
      )?.square;
      
      if (kingSquare) {
        styles[kingSquare] = { backgroundColor: 'rgba(255, 0, 0, 0.6)' };
      }
    }

    // Selected square highlight
    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' };
    }

    return styles;
  }, [lastMove, game, selectedSquare]);

  // Custom square rendering for legal move dots
  const customSquare = useCallback(
    ({ square, squareColor, style }: any) => {
      const isLegalMove = legalMoves.includes(square as Square);
      const piece = game.get(square as Square);
      const isCapture = isLegalMove && piece;

      return (
        <div
          style={{
            ...style,
            position: 'relative',
          }}
          onClick={() => handleSquareClick(square as Square)}
        >
          {isLegalMove && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: isCapture ? '90%' : '30%',
                height: isCapture ? '90%' : '30%',
                borderRadius: '50%',
                backgroundColor: isCapture ? 'transparent' : 'rgba(0, 0, 0, 0.2)',
                border: isCapture ? '4px solid rgba(0, 0, 0, 0.2)' : 'none',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      );
    },
    [legalMoves, game, handleSquareClick]
  );

  return (
    <div className="chess-board-wrapper w-full relative">
      <div style={{ width: boardWidth || '100%', position: 'relative' }}>
        <Chessboard
          position={currentPosition}
          onPieceDrop={handlePieceDrop}
          boardOrientation={orientation}
          customSquareStyles={getCustomSquareStyles()}
          onSquareClick={handleSquareClick}
          customBoardStyle={{
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          }}
          customLightSquareStyle={{
            backgroundColor: BOARD_THEMES.find((t) => t.id === preferences.boardTheme)?.lightSquare || '#f0d9b5',
          }}
          customDarkSquareStyle={{
            backgroundColor: BOARD_THEMES.find((t) => t.id === preferences.boardTheme)?.darkSquare || '#b58863',
          }}
          customPieces={
            preferences.pieceSet !== 'default'
              ? {
                  wP: () => <img src={`/pieces/${preferences.pieceSet}/wP.svg`} alt="White Pawn" />,
                  wN: () => <img src={`/pieces/${preferences.pieceSet}/wN.svg`} alt="White Knight" />,
                  wB: () => <img src={`/pieces/${preferences.pieceSet}/wB.svg`} alt="White Bishop" />,
                  wR: () => <img src={`/pieces/${preferences.pieceSet}/wR.svg`} alt="White Rook" />,
                  wQ: () => <img src={`/pieces/${preferences.pieceSet}/wQ.svg`} alt="White Queen" />,
                  wK: () => <img src={`/pieces/${preferences.pieceSet}/wK.svg`} alt="White King" />,
                  bP: () => <img src={`/pieces/${preferences.pieceSet}/bP.svg`} alt="Black Pawn" />,
                  bN: () => <img src={`/pieces/${preferences.pieceSet}/bN.svg`} alt="Black Knight" />,
                  bB: () => <img src={`/pieces/${preferences.pieceSet}/bB.svg`} alt="Black Bishop" />,
                  bR: () => <img src={`/pieces/${preferences.pieceSet}/bR.svg`} alt="Black Rook" />,
                  bQ: () => <img src={`/pieces/${preferences.pieceSet}/bQ.svg`} alt="Black Queen" />,
                  bK: () => <img src={`/pieces/${preferences.pieceSet}/bK.svg`} alt="Black King" />,
                }
              : undefined
          }
        />
        
        {/* Legal move highlights overlay */}
        {legalMoves.length > 0 && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gridTemplateRows: 'repeat(8, 1fr)',
            }}
          >
            {Array.from({ length: 64 }).map((_, index) => {
              const file = String.fromCharCode(97 + (index % 8));
              const rank = 8 - Math.floor(index / 8);
              const square = `${file}${rank}` as Square;
              const isLegalMove = legalMoves.includes(square);
              const piece = game.get(square);
              const isCapture = isLegalMove && piece;

              if (!isLegalMove) return <div key={square} />;

              return (
                <div
                  key={square}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: isCapture ? '90%' : '30%',
                      height: isCapture ? '90%' : '30%',
                      borderRadius: '50%',
                      backgroundColor: isCapture ? 'transparent' : 'rgba(0, 0, 0, 0.2)',
                      border: isCapture ? '4px solid rgba(0, 0, 0, 0.2)' : 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promotion Dialog */}
      {showPromotionDialog && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Choose Promotion Piece
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => handlePromotion('q')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Queen"
              >
                <Crown className="w-12 h-12 text-yellow-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Queen</span>
              </button>
              <button
                onClick={() => handlePromotion('r')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Rook"
              >
                <Castle className="w-12 h-12 text-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Rook</span>
              </button>
              <button
                onClick={() => handlePromotion('b')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Bishop"
              >
                <Shield className="w-12 h-12 text-purple-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Bishop</span>
              </button>
              <button
                onClick={() => handlePromotion('n')}
                className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Knight"
              >
                <Swords className="w-12 h-12 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Knight</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              Auto-promotes to Queen in 30 seconds
            </p>
          </div>
        </div>
      )}

      {/* Move Confirmation Dialog (for touch devices - Requirement 21.3) */}
      {showMoveConfirmation && pendingMove && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Confirm Move
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Move from <span className="font-mono font-bold">{pendingMove.from}</span> to{' '}
              <span className="font-mono font-bold">{pendingMove.to}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmMove}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={handleCancelMove}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {showGameOverModal && gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Game Over
              </h2>
              <button
                onClick={() => setGameOver(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              {gameOver.result === 'checkmate' && (
                <>
                  <p className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Checkmate!
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {gameOver.winner === 'white' ? 'White' : 'Black'} wins
                  </p>
                </>
              )}
              {gameOver.result === 'stalemate' && (
                <>
                  <p className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Stalemate
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    The game is a draw
                  </p>
                </>
              )}
              {gameOver.result === 'draw' && (
                <>
                  <p className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    Draw
                  </p>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    The game ended in a draw
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              {onRematch && (
                <button
                  onClick={onRematch}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Rematch
                </button>
              )}
              {onNewGame && (
                <button
                  onClick={onNewGame}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  New Game
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
