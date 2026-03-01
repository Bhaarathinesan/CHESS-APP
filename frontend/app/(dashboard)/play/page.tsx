'use client';

import { ChessBoard, MoveList, CapturedPieces } from '@/components/chess';
import type { Move, CapturedPiece } from '@/components/chess';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export default function PlayPage() {
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  
  // Sample moves for demonstration
  const [moves] = useState<Move[]>([
    {
      moveNumber: 1,
      white: { san: 'e4', timestamp: 5000 },
      black: { san: 'e5', timestamp: 4500 },
    },
    {
      moveNumber: 2,
      white: { san: 'Nf3', timestamp: 3000 },
      black: { san: 'Nc6', timestamp: 3500 },
    },
    {
      moveNumber: 3,
      white: { san: 'Bb5', timestamp: 4000 },
      black: { san: 'a6', timestamp: 2500 },
    },
  ]);

  // Sample captured pieces for demonstration
  const [capturedByWhite] = useState<CapturedPiece[]>([
    { type: 'p', color: 'b' },
    { type: 'n', color: 'b' },
  ]);

  const [capturedByBlack] = useState<CapturedPiece[]>([
    { type: 'p', color: 'w' },
  ]);

  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
    console.log('Move made:', move);
  };

  const handleGameOver = (result: 'checkmate' | 'stalemate' | 'draw' | 'resignation' | 'timeout', winner?: 'white' | 'black') => {
    console.log('Game over:', result, winner);
  };

  const handleRematch = () => {
    console.log('Rematch requested');
    // TODO: Implement rematch logic
  };

  const handleNewGame = () => {
    console.log('New game requested');
    // TODO: Implement new game logic
  };

  const handleMoveClick = (moveIndex: number) => {
    console.log('Navigate to move:', moveIndex);
  };

  const flipBoard = () => {
    setOrientation(orientation === 'white' ? 'black' : 'white');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Play Chess</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Game Board</h2>
                <Button onClick={flipBoard} variant="secondary" size="sm">
                  Flip Board
                </Button>
              </div>
              <div className="flex justify-center">
                <div className="w-full max-w-[600px]">
                  <ChessBoard
                    orientation={orientation}
                    onMove={handleMove}
                    onGameOver={handleGameOver}
                    onRematch={handleRematch}
                    onNewGame={handleNewGame}
                    arePiecesDraggable={true}
                    showGameOverModal={true}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Game Info Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Game Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Time Control</span>
                  <span className="font-medium">5+3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Rated</span>
                  <span className="font-medium">Yes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Your Color</span>
                  <span className="font-medium capitalize">{orientation}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button className="w-full" variant="primary">
                  Find Opponent
                </Button>
                <Button className="w-full" variant="secondary">
                  Play vs Computer
                </Button>
                <Button className="w-full" variant="secondary">
                  Create Custom Game
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <MoveList
                moves={moves}
                onMoveClick={handleMoveClick}
                showTimestamps={true}
                useFigurineNotation={false}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Captured Pieces</h3>
              <CapturedPieces
                capturedByWhite={capturedByWhite}
                capturedByBlack={capturedByBlack}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
