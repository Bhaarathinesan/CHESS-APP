'use client';

import { Chessboard } from 'react-chessboard';
import { Chess, Square, Move } from 'chess.js';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Crown, Castle, Shield, Swords, X } from 'lucide-react';
import { useChessPreferences } from '@/hooks/useChessPreferences';
import { BOARD_THEMES } from '@/types/chess-preferences';
import { useResponsive } from '@/hooks/useResponsive';
import { useGestures } from '@/hooks/useGestures';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

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
  // Mobile gesture callbacks (Requirements 21.5, 21.6, 21.7, 21.10)
  onNavigateHistory?: (direction: 'forward' | 'backward') => void; // For swipe gestures (Requirement 21.5)
  onRefresh?: () => void | Promise<void>; // For pull-to-refresh (Requirement 21.10)
  enableGestures?: boolean; // Enable mobile gestures (default: true on touch devices)
  moveHistory?: Array<{ from: string; to: string }>; // For displaying move options on long-press
}

/**
 * ChessBoard wrapper component for react-chessboard
 * Provides move validation using chess.js and custom styling
 * Features:
 * - Drag-and-drop piece movement (Requirement 21.2) - works on both desktop and touch devices
 * - Tap-tap (click-click) piece movement (Requirement 21.2) - optimized for mobile
 * - Legal move highlights with dots for empty squares and circles for captures (Requirement 21.2)
 * - Move confirmation dialog for touch devices (Requirement 21.3) - auto-enabled on touch devices
 * - Touch-optimized UI with larger touch targets (48px minimum) for mobile devices
 * - Prevents default touch behaviors to improve piece movement on mobile
 * - Mobile-responsive dialogs with appropriate sizing and spacing
 * - Pawn promotion dialog with 30s auto-promote (Requirements 3.12, 3.13)
 * - Last move highlight (yellow/blue)
 * - Check indicator (red highlight on king)
 * - Game over modal (checkmate/stalemate/draw)
 * - Customizable board themes (Requirement 22.16)
 * - Customizable piece sets (Requirement 22.17)
 * - Swipe gestures for move history navigation (Requirement 21.5)
 * - Pinch-to-zoom for board viewing (Requirement 21.6)
 * - Long-press for move options (Requirement 21.7)
 * - Pull-to-refresh for game state updates (Requirement 21.10)
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
  onNavigateHistory,
  onRefresh,
  enableGestures = true,
  moveHistory = [],
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
  const [boardScale, setBoardScale] = useState<number>(1); // For pinch-to-zoom (Requirement 21.6)
  const [showMoveOptions, setShowMoveOptions] = useState(false); // For long-press (Requirement 21.7)
  const [longPressSquare, setLongPressSquare] = useState<Square | null>(null);
  
  const promotionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const { preferences } = useChessPreferences();
  const { isTouchDevice, isMobile } = useResponsive();
  const { triggerHaptic } = useHapticFeedback();
  
  // Auto-enable move confirmation on touch devices (Requirement 21.3)
  const shouldConfirmMoves = requireMoveConfirmation || isTouchDevice;
  const gesturesEnabled = enableGestures && isTouchDevice;

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

  // Mobile gesture handlers (Requirements 21.5, 21.6, 21.7, 21.10)
  const handleSwipeLeft = useCallback(() => {
    if (onNavigateHistory) {
      onNavigateHistory('forward');
    }
  }, [onNavigateHistory]);

  const handleSwipeRight = useCallback(() => {
    if (onNavigateHistory) {
      onNavigateHistory('backward');
    }
  }, [onNavigateHistory]);

  const handlePinch = useCallback((scale: number) => {
    setBoardScale(scale);
  }, []);

  const handlePinchEnd = useCallback((finalScale: number) => {
    // Snap to nearest 0.25 increment for better UX
    const snappedScale = Math.round(finalScale * 4) / 4;
    setBoardScale(snappedScale);
  }, []);

  const handleLongPress = useCallback((x: number, y: number) => {
    // Find which square was long-pressed
    const boardElement = boardContainerRef.current;
    if (!boardElement) return;

    const rect = boardElement.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    // Calculate square from coordinates
    const squareSize = rect.width / 8;
    const file = Math.floor(relativeX / squareSize);
    const rank = Math.floor(relativeY / squareSize);
    
    // Convert to chess notation
    const fileChar = String.fromCharCode(97 + file); // a-h
    const rankNum = 8 - rank; // 8-1
    const square = `${fileChar}${rankNum}` as Square;
    
    // Check if there's a piece on this square
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setLongPressSquare(square);
      setShowMoveOptions(true);
      
      // Also select the square and show legal moves
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }) as Move[];
      setLegalMoves(moves.map((m) => m.to as Square));
    }
  }, [game]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  // Set up gesture handlers
  useGestures(boardContainerRef, {
    swipe: gesturesEnabled && onNavigateHistory ? {
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight,
      threshold: 50,
      velocityThreshold: 0.3,
    } : undefined,
    pinch: gesturesEnabled ? {
      onPinch: handlePinch,
      onPinchEnd: handlePinchEnd,
      minScale: 0.5,
      maxScale: 2.5,
    } : undefined,
    longPress: gesturesEnabled ? {
      onLongPress: handleLongPress,
      delay: 500,
      movementThreshold: 10,
    } : undefined,
    pullToRefresh: gesturesEnabled && onRefresh ? {
      onRefresh: handleRefresh,
      threshold: 80,
      enabled: true,
    } : undefined,
  });

  // Prevent default touch behaviors on mobile to improve piece movement (Requirement 21.2)
  useEffect(() => {
    if (!isTouchDevice) return;

    const preventDefaultTouch = (e: Event) => {
      const touchEvent = e as TouchEvent;
      // Prevent default touch behaviors like scrolling and zooming during piece movement
      // This is only applied to the chess board area
      const target = touchEvent.target as HTMLElement;
      if (target.closest('.chess-board-wrapper')) {
        // Allow single touch for piece movement, prevent multi-touch gestures
        if (touchEvent.touches.length > 1) {
          touchEvent.preventDefault();
        }
      }
    };

    const boardElement = document.querySelector('.chess-board-wrapper');
    if (boardElement) {
      boardElement.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    }

    return () => {
      if (boardElement) {
        boardElement.removeEventListener('touchmove', preventDefaultTouch);
      }
    };
  }, [isTouchDevice]);

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
          } else if (shouldConfirmMoves) {
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
            // Light haptic for piece selection
            triggerHaptic('SELECT');
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
          // Light haptic for piece selection
          triggerHaptic('SELECT');
          setSelectedSquare(square);
          const moves = game.moves({ square, verbose: true }) as Move[];
          setLegalMoves(moves.map((m) => m.to as Square));
        }
      }
    },
    [selectedSquare, game, arePiecesDraggable, shouldConfirmMoves, triggerHaptic]
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

        // Trigger haptic feedback based on move type (Requirement 21.4)
        if (move.captured) {
          // Medium haptic for captures
          triggerHaptic('CAPTURE');
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          // Medium haptic for castling
          triggerHaptic('CASTLING');
        } else {
          // Light haptic for regular moves
          triggerHaptic('MOVE');
        }

        // Check for check or checkmate after the move
        if (game.isCheckmate()) {
          // Strong pattern for checkmate
          triggerHaptic('CHECKMATE');
        } else if (game.inCheck()) {
          // Strong pattern for check
          triggerHaptic('CHECK');
        }

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
    [game, onMove, triggerHaptic]
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

      // Show confirmation dialog for touch devices if required (Requirement 21.3)
      if (shouldConfirmMoves) {
        setPendingMove({ from, to });
        setShowMoveConfirmation(true);
        return false; // Don't complete the move yet
      }

      return makeMove(from, to);
    },
    [game, makeMove, shouldConfirmMoves]
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
    <div 
      ref={boardContainerRef}
      className="chess-board-wrapper w-full relative overflow-hidden"
      style={{
        // Prevent text selection and callouts on touch devices (Requirement 21.2)
        WebkitUserSelect: isTouchDevice ? 'none' : 'auto',
        userSelect: isTouchDevice ? 'none' : 'auto',
        touchAction: isTouchDevice ? 'none' : 'auto',
      }}
    >
      <div 
        style={{ 
          width: boardWidth || '100%', 
          position: 'relative',
          // Apply pinch-to-zoom scale (Requirement 21.6)
          transform: `scale(${boardScale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out',
        }}
      >
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
          // Improve touch responsiveness (Requirement 21.2)
          arePiecesDraggable={arePiecesDraggable}
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
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          style={{
            // Prevent touch events from propagating to the board
            touchAction: 'none',
          }}
        >
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'p-4 mx-4 w-full max-w-sm' : 'p-6'}`}>
            <h3 className={`font-semibold mb-4 text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
              Choose Promotion Piece
            </h3>
            <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'flex-row'}`}>
              <button
                onClick={() => handlePromotion('q')}
                className={`flex items-center gap-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors ${isMobile ? 'p-3 justify-start' : 'flex-col p-4'}`}
                title="Queen"
                style={{
                  // Larger touch target for mobile (Requirement 21.2)
                  minHeight: isMobile ? '56px' : 'auto',
                }}
              >
                <Crown className={`text-yellow-500 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} />
                <span className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-base font-medium' : 'text-sm'}`}>Queen</span>
              </button>
              <button
                onClick={() => handlePromotion('r')}
                className={`flex items-center gap-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors ${isMobile ? 'p-3 justify-start' : 'flex-col p-4'}`}
                title="Rook"
                style={{
                  minHeight: isMobile ? '56px' : 'auto',
                }}
              >
                <Castle className={`text-blue-500 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} />
                <span className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-base font-medium' : 'text-sm'}`}>Rook</span>
              </button>
              <button
                onClick={() => handlePromotion('b')}
                className={`flex items-center gap-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors ${isMobile ? 'p-3 justify-start' : 'flex-col p-4'}`}
                title="Bishop"
                style={{
                  minHeight: isMobile ? '56px' : 'auto',
                }}
              >
                <Shield className={`text-purple-500 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} />
                <span className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-base font-medium' : 'text-sm'}`}>Bishop</span>
              </button>
              <button
                onClick={() => handlePromotion('n')}
                className={`flex items-center gap-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors ${isMobile ? 'p-3 justify-start' : 'flex-col p-4'}`}
                title="Knight"
                style={{
                  minHeight: isMobile ? '56px' : 'auto',
                }}
              >
                <Swords className={`text-green-500 ${isMobile ? 'w-8 h-8' : 'w-12 h-12'}`} />
                <span className={`text-gray-700 dark:text-gray-300 ${isMobile ? 'text-base font-medium' : 'text-sm'}`}>Knight</span>
              </button>
            </div>
            <p className={`text-gray-500 dark:text-gray-400 mt-4 text-center ${isMobile ? 'text-xs' : 'text-xs'}`}>
              Auto-promotes to Queen in 30 seconds
            </p>
          </div>
        </div>
      )}

      {/* Move Confirmation Dialog (for touch devices - Requirement 21.3) */}
      {showMoveConfirmation && pendingMove && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          style={{
            // Prevent touch events from propagating to the board
            touchAction: 'none',
          }}
        >
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'p-4 mx-4 w-full max-w-sm' : 'p-6 max-w-sm w-full'}`}>
            <h3 className={`font-semibold mb-3 text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
              Confirm Move
            </h3>
            <p className={`text-gray-700 dark:text-gray-300 mb-4 ${isMobile ? 'text-sm' : 'text-base'}`}>
              Move from <span className="font-mono font-bold">{pendingMove.from}</span> to{' '}
              <span className="font-mono font-bold">{pendingMove.to}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmMove}
                className={`flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg font-medium transition-colors ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-2'}`}
                style={{
                  // Larger touch target for mobile (Requirement 21.2)
                  minHeight: isMobile ? '48px' : '40px',
                }}
              >
                Confirm
              </button>
              <button
                onClick={handleCancelMove}
                className={`flex-1 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-lg font-medium transition-colors ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-2'}`}
                style={{
                  // Larger touch target for mobile (Requirement 21.2)
                  minHeight: isMobile ? '48px' : '40px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {showGameOverModal && gameOver && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          style={{
            // Prevent touch events from propagating to the board
            touchAction: 'none',
          }}
        >
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'p-6 mx-4 w-full max-w-sm' : 'p-8 max-w-md w-full'}`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                Game Over
              </h2>
              <button
                onClick={() => setGameOver(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 active:text-gray-900 dark:active:text-gray-100"
                style={{
                  // Larger touch target for mobile
                  minWidth: isMobile ? '44px' : 'auto',
                  minHeight: isMobile ? '44px' : 'auto',
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              {gameOver.result === 'checkmate' && (
                <>
                  <p className={`font-semibold text-gray-800 dark:text-gray-200 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    Checkmate!
                  </p>
                  <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    {gameOver.winner === 'white' ? 'White' : 'Black'} wins
                  </p>
                </>
              )}
              {gameOver.result === 'stalemate' && (
                <>
                  <p className={`font-semibold text-gray-800 dark:text-gray-200 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    Stalemate
                  </p>
                  <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    The game is a draw
                  </p>
                </>
              )}
              {gameOver.result === 'draw' && (
                <>
                  <p className={`font-semibold text-gray-800 dark:text-gray-200 mb-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                    Draw
                  </p>
                  <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    The game ended in a draw
                  </p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              {onRematch && (
                <button
                  onClick={onRematch}
                  className={`flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-2'}`}
                  style={{
                    // Larger touch target for mobile
                    minHeight: isMobile ? '48px' : '40px',
                  }}
                >
                  Rematch
                </button>
              )}
              {onNewGame && (
                <button
                  onClick={onNewGame}
                  className={`flex-1 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-lg font-medium transition-colors ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-2'}`}
                  style={{
                    // Larger touch target for mobile
                    minHeight: isMobile ? '48px' : '40px',
                  }}
                >
                  New Game
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Move Options Dialog (for long-press - Requirement 21.7) */}
      {showMoveOptions && longPressSquare && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
          style={{
            touchAction: 'none',
          }}
        >
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${isMobile ? 'p-4 mx-4 w-full max-w-sm' : 'p-6 max-w-md w-full'}`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                Move Options for {longPressSquare.toUpperCase()}
              </h3>
              <button
                onClick={() => {
                  setShowMoveOptions(false);
                  setLongPressSquare(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                style={{
                  minWidth: isMobile ? '44px' : 'auto',
                  minHeight: isMobile ? '44px' : 'auto',
                }}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              {legalMoves.length > 0 ? (
                <>
                  <p className={`text-gray-700 dark:text-gray-300 mb-3 ${isMobile ? 'text-sm' : 'text-base'}`}>
                    {legalMoves.length} legal move{legalMoves.length !== 1 ? 's' : ''} available:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {legalMoves.map((square) => {
                      const piece = game.get(square);
                      const isCapture = !!piece;
                      return (
                        <button
                          key={square}
                          onClick={() => {
                            handleSquareClick(square);
                            setShowMoveOptions(false);
                            setLongPressSquare(null);
                          }}
                          className={`p-3 rounded-lg font-mono font-bold transition-colors ${
                            isCapture
                              ? 'bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-200'
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                          }`}
                          style={{
                            minHeight: isMobile ? '48px' : '40px',
                          }}
                        >
                          {square}
                          {isCapture && <span className="text-xs block">×</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-sm' : 'text-base'}`}>
                  No legal moves available for this piece.
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setShowMoveOptions(false);
                setLongPressSquare(null);
                setSelectedSquare(null);
                setLegalMoves([]);
              }}
              className={`w-full mt-4 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-lg font-medium transition-colors ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-2'}`}
              style={{
                minHeight: isMobile ? '48px' : '40px',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
