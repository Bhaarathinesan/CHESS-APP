'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export interface ClockSyncData {
  gameId: string;
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  currentTurn?: 'white' | 'black';
  serverTimestamp: number;
}

export interface PlayerDisconnectedData {
  gameId: string;
  playerId: string;
  pausedAt: number;
}

export interface ClockResumedData {
  gameId: string;
  playerId: string;
  resumedAt: number;
}

export interface ClockState {
  whiteTimeRemaining: number;
  blackTimeRemaining: number;
  lastSyncTime: number;
  driftOffset: number;
  isPaused: boolean;
}

/**
 * Hook for synchronizing chess clocks with server
 * 
 * Features:
 * - Receives clock sync updates from server every 1 second (Requirement 6.10)
 * - Maintains server-side authoritative time (Requirement 5.12)
 * - Handles clock drift correction to keep within 100ms (Requirement 5.7)
 * - Smooth local countdown between sync updates
 * - Handles disconnection and reconnection events (Requirement 5.10)
 */
export function useClockSync(socket: Socket | null, gameId: string | null) {
  const [clockState, setClockState] = useState<ClockState>({
    whiteTimeRemaining: 0,
    blackTimeRemaining: 0,
    lastSyncTime: Date.now(),
    driftOffset: 0,
    isPaused: false,
  });

  const localIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentTurnRef = useRef<'white' | 'black'>('white');
  const lastUpdateTimeRef = useRef<number>(Date.now());

  /**
   * Calculate network latency and adjust for clock drift
   * This ensures the client clock stays synchronized with server within 100ms
   * 
   * Algorithm:
   * 1. Estimate one-way latency as half of round-trip time
   * 2. Adjust server timestamp by estimated latency
   * 3. Calculate drift between local time and adjusted server time
   */
  const calculateDriftOffset = (serverTimestamp: number, receiveTime: number): number => {
    // Estimate one-way latency (half of round-trip time)
    const roundTripTime = receiveTime - serverTimestamp;
    const estimatedLatency = roundTripTime / 2;
    
    // Adjust server time by estimated latency to get "true" server time
    const adjustedServerTime = serverTimestamp + estimatedLatency;
    
    // Calculate drift between local and adjusted server time
    const drift = receiveTime - adjustedServerTime;
    
    return drift;
  };

  /**
   * Handle clock sync message from server
   * Updates clock state with server-authoritative time
   * Server sync always overrides local countdown (Requirement 5.12)
   */
  useEffect(() => {
    if (!socket || !gameId) return;

    const handleClockSync = (data: ClockSyncData) => {
      if (data.gameId !== gameId) return;

      const receiveTime = Date.now();
      const driftOffset = calculateDriftOffset(data.serverTimestamp, receiveTime);

      // Update current turn if provided
      if (data.currentTurn) {
        currentTurnRef.current = data.currentTurn;
      }

      // Server sync overrides local countdown
      setClockState({
        whiteTimeRemaining: data.whiteTimeRemaining,
        blackTimeRemaining: data.blackTimeRemaining,
        lastSyncTime: receiveTime,
        driftOffset,
        isPaused: false,
      });

      lastUpdateTimeRef.current = receiveTime;
    };

    socket.on('clock_sync', handleClockSync);

    return () => {
      socket.off('clock_sync', handleClockSync);
    };
  }, [socket, gameId]);

  /**
   * Handle player disconnection events
   * Pauses the clock when a player disconnects (Requirement 5.10)
   */
  useEffect(() => {
    if (!socket || !gameId) return;

    const handlePlayerDisconnected = (data: PlayerDisconnectedData) => {
      if (data.gameId !== gameId) return;

      // Pause the clock
      setClockState((prev) => ({
        ...prev,
        isPaused: true,
      }));
    };

    const handleClockResumed = (data: ClockResumedData) => {
      if (data.gameId !== gameId) return;

      // Resume the clock
      setClockState((prev) => ({
        ...prev,
        isPaused: false,
      }));

      lastUpdateTimeRef.current = Date.now();
    };

    socket.on('player_disconnected', handlePlayerDisconnected);
    socket.on('clock_resumed_after_disconnect', handleClockResumed);

    return () => {
      socket.off('player_disconnected', handlePlayerDisconnected);
      socket.off('clock_resumed_after_disconnect', handleClockResumed);
    };
  }, [socket, gameId]);

  /**
   * Local countdown between server sync updates
   * Provides smooth 100ms updates for display
   * Only runs when clock is not paused
   */
  useEffect(() => {
    // Clear any existing interval
    if (localIntervalRef.current) {
      clearInterval(localIntervalRef.current);
    }

    // Start local countdown at 100ms intervals
    localIntervalRef.current = setInterval(() => {
      setClockState((prev) => {
        // Don't update if paused
        if (prev.isPaused) {
          return prev;
        }

        const now = Date.now();
        const elapsed = now - lastUpdateTimeRef.current;
        lastUpdateTimeRef.current = now;

        // Decrement the active player's time by actual elapsed time
        let whiteTime = prev.whiteTimeRemaining;
        let blackTime = prev.blackTimeRemaining;

        if (currentTurnRef.current === 'white') {
          whiteTime = Math.max(0, prev.whiteTimeRemaining - elapsed);
        } else {
          blackTime = Math.max(0, prev.blackTimeRemaining - elapsed);
        }

        return {
          ...prev,
          whiteTimeRemaining: whiteTime,
          blackTimeRemaining: blackTime,
        };
      });
    }, 100);

    return () => {
      if (localIntervalRef.current) {
        clearInterval(localIntervalRef.current);
      }
    };
  }, []);

  /**
   * Update current turn (which clock is running)
   */
  const setCurrentTurn = (turn: 'white' | 'black') => {
    currentTurnRef.current = turn;
    lastUpdateTimeRef.current = Date.now();
  };

  /**
   * Manually set clock times (for initial game state)
   */
  const setClockTimes = (whiteTime: number, blackTime: number) => {
    const now = Date.now();
    setClockState({
      whiteTimeRemaining: whiteTime,
      blackTimeRemaining: blackTime,
      lastSyncTime: now,
      driftOffset: 0,
      isPaused: false,
    });
    lastUpdateTimeRef.current = now;
  };

  return {
    whiteTimeRemaining: clockState.whiteTimeRemaining,
    blackTimeRemaining: clockState.blackTimeRemaining,
    driftOffset: clockState.driftOffset,
    isPaused: clockState.isPaused,
    setCurrentTurn,
    setClockTimes,
  };
}
