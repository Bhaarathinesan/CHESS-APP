'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import MoveNavigator from '@/components/history/MoveNavigator';
import GameInfo from '@/components/history/GameInfo';
import MoveList from '@/components/chess/MoveList';
import Link from 'next/link';

export default function PublicGameViewPage() {
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<any>(null);
  const [moves, setMoves] = useState<any[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [chess] = useState(new Chess());
  const [position, setPosition] = useState(chess.fen());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        // Use public endpoint
        const response = await fetch(`http://localhost:3001/api/games/${gameId}/public`);

        if (!response.ok) {
          throw new Error('Failed to fetch game');
        }

        const gameData = await response.json();
        setGame(gameData);

        // Fetch moves using public endpoint
        const movesResponse = await fetch(
          `http://localhost:3001/api/games/${gameId}/public/moves`
        );

        if (movesResponse.ok) {
          const movesData = await movesResponse.json();
          setMoves(movesData);

          // Start at the last move
          setCurrentMoveIndex(movesData.length);
          navigateToMove(movesData.length, movesData);
        }
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  const navigateToMove = (index: number, movesArray = moves) => {
    // Reset chess to starting position
    chess.reset();

    // Apply moves up to the target index
    for (let i = 0; i < index; i++) {
      if (movesArray[i]) {
        try {
          chess.move(movesArray[i].uci);
        } catch (err) {
          console.error('Error applying move:', err);
        }
      }
    }

    setPosition(chess.fen());
    setCurrentMoveIndex(index);
  };

  const handleNavigate = (index: number) => {
    navigateToMove(index);
  };

  const handleMoveClick = (index: number) => {
    navigateToMove(index + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-foreground-secondary mt-4">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
          <p className="text-red-500">{error || 'Game not found'}</p>
          <Link
            href="/"
            className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background-secondary border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">ChessArena</h1>
              <p className="text-sm text-foreground-secondary">
                {game.whitePlayer.displayName} vs {game.blackPlayer.displayName}
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Play Chess
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Board and Navigator */}
          <div className="lg:col-span-2 space-y-4">
            {/* Chess Board */}
            <div className="bg-background-secondary border border-border rounded-lg p-4">
              <Chessboard
                position={position}
                arePiecesDraggable={false}
                boardWidth={Math.min(600, typeof window !== 'undefined' ? window.innerWidth - 100 : 600)}
              />
            </div>

            {/* Move Navigator */}
            <MoveNavigator
              currentMoveIndex={currentMoveIndex}
              totalMoves={moves.length}
              onNavigate={handleNavigate}
            />

            {/* Move List */}
            <div className="bg-background-secondary border border-border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Moves</h3>
              <MoveList
                moves={moves.map((m) => m.san)}
                currentMoveIndex={currentMoveIndex - 1}
                onMoveClick={handleMoveClick}
              />
            </div>
          </div>

          {/* Right Column: Game Info */}
          <div className="lg:col-span-1">
            <GameInfo game={game} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-background-secondary border-t border-border mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-foreground-secondary">
          <p>© 2024 ChessArena. Play chess online with friends and compete in tournaments.</p>
        </div>
      </div>
    </div>
  );
}
