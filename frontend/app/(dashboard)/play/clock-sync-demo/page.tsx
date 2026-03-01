'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChessClock } from '@/components/chess';
import { useClockSync } from '@/hooks/useClockSync';
import { io, Socket } from 'socket.io-client';

/**
 * Clock Synchronization Demo Page
 * 
 * Demonstrates the clock synchronization implementation for Task 10.5
 * 
 * Features:
 * - Real-time clock sync with server
 * - Drift correction display
 * - Server-side authoritative time
 * - Smooth local countdown
 */
export default function ClockSyncDemoPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameId] = useState('demo-game-123');
  const [currentTurn, setCurrentTurn] = useState<'white' | 'black'>('white');
  const [isConnected, setIsConnected] = useState(false);

  const {
    whiteTimeRemaining,
    blackTimeRemaining,
    driftOffset,
    setCurrentTurn: updateTurn,
    setClockTimes,
  } = useClockSync(socket, gameId);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:3001/game', {
      auth: {
        token: 'demo-token', // In real app, use actual JWT
      },
    });

    newSocket.on('connect', () => {
      console.log('Connected to game server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from game server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Start the clock
  const handleStartClock = () => {
    if (!socket) return;

    socket.emit('start_clock', {
      gameId,
      whiteTimeRemaining: 300000, // 5 minutes
      blackTimeRemaining: 300000,
      currentTurn: 'white',
    });

    setClockTimes(300000, 300000);
    updateTurn('white');
  };

  // Simulate a move (switch turns)
  const handleMove = () => {
    const newTurn = currentTurn === 'white' ? 'black' : 'white';
    setCurrentTurn(newTurn);
    updateTurn(newTurn);

    if (socket) {
      socket.emit('update_clock', {
        gameId,
        whiteTimeRemaining,
        blackTimeRemaining,
        currentTurn: newTurn,
      });
    }
  };

  // Stop the clock
  const handleStopClock = () => {
    if (!socket) return;

    socket.emit('stop_clock', {
      gameId,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Clock Synchronization Demo</h1>
        <p className="text-foreground-secondary mb-6">
          Demonstrates real-time clock sync with server authority and drift correction
        </p>

        {/* Connection Status */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="font-medium">
                {isConnected ? 'Connected to Server' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-foreground-secondary">
              Game ID: {gameId}
            </div>
          </div>
        </Card>

        {/* Clock Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">White Player</h2>
            <ChessClock
              timeRemaining={whiteTimeRemaining}
              isActive={currentTurn === 'white'}
              playerName="White"
              playerColor="white"
              timeControlDisplay="5+0"
              showWarning={true}
              enableSound={true}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Black Player</h2>
            <ChessClock
              timeRemaining={blackTimeRemaining}
              isActive={currentTurn === 'black'}
              playerName="Black"
              playerColor="black"
              timeControlDisplay="5+0"
              showWarning={true}
              enableSound={true}
            />
          </Card>
        </div>

        {/* Controls */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Clock Controls</h2>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleStartClock}
              disabled={!isConnected}
              variant="primary"
            >
              Start Clock
            </Button>
            <Button
              onClick={handleMove}
              disabled={!isConnected}
              variant="secondary"
            >
              Make Move (Switch Turn)
            </Button>
            <Button
              onClick={handleStopClock}
              disabled={!isConnected}
              variant="secondary"
            >
              Stop Clock
            </Button>
          </div>
        </Card>

        {/* Synchronization Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Synchronization Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-foreground-secondary">Current Turn:</span>
              <span className="font-medium capitalize">{currentTurn}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground-secondary">Clock Drift:</span>
              <span className="font-medium font-mono">
                {Math.abs(driftOffset).toFixed(2)}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground-secondary">Drift Status:</span>
              <span
                className={`font-medium ${
                  Math.abs(driftOffset) < 100
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {Math.abs(driftOffset) < 100 ? '✓ Within 100ms' : '✗ Exceeds 100ms'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground-secondary">White Time:</span>
              <span className="font-medium font-mono">
                {(whiteTimeRemaining / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground-secondary">Black Time:</span>
              <span className="font-medium font-mono">
                {(blackTimeRemaining / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </Card>

        {/* Implementation Notes */}
        <Card className="p-6 mt-6 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="text-lg font-semibold mb-3">Implementation Notes</h3>
          <ul className="space-y-2 text-sm text-foreground-secondary">
            <li>
              <strong>Server Authority:</strong> Clock times are tracked server-side in
              Redis to prevent manipulation (Requirement 5.12)
            </li>
            <li>
              <strong>1-Second Sync:</strong> Server broadcasts clock updates every 1
              second to all clients (Requirement 6.10)
            </li>
            <li>
              <strong>Drift Correction:</strong> Client calculates network latency and
              adjusts for drift to maintain &lt;100ms accuracy (Requirement 5.7)
            </li>
            <li>
              <strong>Local Countdown:</strong> Client runs smooth 100ms countdown
              between server syncs for responsive display
            </li>
            <li>
              <strong>Server Override:</strong> Server sync always overrides local
              countdown to ensure accuracy
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
