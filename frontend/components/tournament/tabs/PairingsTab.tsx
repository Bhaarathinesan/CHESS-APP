'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import { BracketView } from '../BracketView';

interface Pairing {
  id: string;
  roundNumber: number;
  boardNumber: number;
  isBye: boolean;
  result?: string;
  whitePlayer?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  blackPlayer?: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  game?: {
    id: string;
    status: string;
  };
}

interface PairingsTabProps {
  tournamentId: string;
  format: string;
  currentRound: number;
  roundsTotal?: number;
}

interface BracketRound {
  roundNumber: number;
  roundName: string;
  matches: any[];
}

interface PairingsResponse {
  pairings?: Pairing[];
  displayType?: string;
  bracket?: BracketRound[];
  format?: string;
  currentRound?: number;
}

export const PairingsTab: React.FC<PairingsTabProps> = ({
  tournamentId,
  format,
  currentRound,
  roundsTotal,
}) => {
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [bracket, setBracket] = useState<BracketRound[]>([]);
  const [displayType, setDisplayType] = useState<string>('table');
  const [selectedRound, setSelectedRound] = useState(currentRound || 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if tournament is elimination format
  const isEliminationFormat = format === 'SINGLE_ELIMINATION' || format === 'DOUBLE_ELIMINATION';

  useEffect(() => {
    if (selectedRound > 0) {
      fetchPairings();
    }
  }, [tournamentId, selectedRound]);

  const fetchPairings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<PairingsResponse>(
        `/tournaments/${tournamentId}/pairings?round=${selectedRound}`
      );

      // Check if response is bracket format (for elimination tournaments)
      if (response.displayType === 'bracket' && response.bracket) {
        setBracket(response.bracket);
        setDisplayType('bracket');
      } else {
        setPairings(response.pairings || []);
        setDisplayType('table');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pairings');
    } finally {
      setLoading(false);
    }
  };

  const getRoundOptions = () => {
    const maxRound = roundsTotal || currentRound || 1;
    const options = [];
    for (let i = 1; i <= maxRound; i++) {
      options.push({ value: i.toString(), label: `Round ${i}` });
    }
    return options;
  };

  const getResultDisplay = (pairing: Pairing) => {
    if (pairing.isBye) {
      return <span className="text-blue-600 dark:text-blue-400 font-semibold">BYE</span>;
    }

    if (!pairing.result) {
      if (pairing.game?.status === 'active') {
        return <span className="text-green-600 dark:text-green-400 font-semibold">In Progress</span>;
      }
      return <span className="text-gray-500 dark:text-gray-400">Not Started</span>;
    }

    switch (pairing.result) {
      case 'white_win':
        return <span className="font-semibold">1 - 0</span>;
      case 'black_win':
        return <span className="font-semibold">0 - 1</span>;
      case 'draw':
        return <span className="font-semibold">½ - ½</span>;
      default:
        return <span className="text-gray-500 dark:text-gray-400">-</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render bracket view for elimination tournaments
  if (displayType === 'bracket' && isEliminationFormat) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <BracketView
          bracket={bracket}
          format={format}
          currentRound={currentRound}
          loading={loading}
        />
      </div>
    );
  }

  // Render table view for Swiss/Round Robin/Arena tournaments
  return (
    <div className="space-y-4">
      {/* Round Selector */}
      {roundsTotal && roundsTotal > 1 && (
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Round:
          </label>
          <div className="w-48">
            <Select
              name="round"
              value={selectedRound.toString()}
              onChange={(e) => setSelectedRound(Number(e.target.value))}
              options={getRoundOptions()}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {pairings.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No pairings available for this round yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Round {selectedRound} Pairings
            </h3>

            <div className="space-y-3">
              {pairings.map((pairing) => (
                <div
                  key={pairing.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  {/* Board Number */}
                  <div className="w-12 text-center">
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {pairing.boardNumber}
                    </span>
                  </div>

                  {/* White Player */}
                  <div className="flex-1 flex items-center gap-3">
                    {pairing.whitePlayer ? (
                      <>
                        {pairing.whitePlayer.avatarUrl ? (
                          <img
                            src={pairing.whitePlayer.avatarUrl}
                            alt={pairing.whitePlayer.displayName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                            {pairing.whitePlayer.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {pairing.whitePlayer.displayName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            @{pairing.whitePlayer.username}
                          </p>
                        </div>
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">-</span>
                    )}
                  </div>

                  {/* VS / Result */}
                  <div className="px-4 text-center min-w-[100px]">
                    {getResultDisplay(pairing)}
                  </div>

                  {/* Black Player */}
                  <div className="flex-1 flex items-center gap-3 justify-end">
                    {pairing.blackPlayer ? (
                      <>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {pairing.blackPlayer.displayName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            @{pairing.blackPlayer.username}
                          </p>
                        </div>
                        {pairing.blackPlayer.avatarUrl ? (
                          <img
                            src={pairing.blackPlayer.avatarUrl}
                            alt={pairing.blackPlayer.displayName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-semibold">
                            {pairing.blackPlayer.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">-</span>
                    )}
                  </div>

                  {/* View Game Link */}
                  {pairing.game && (
                    <div className="ml-4">
                      <Link
                        href={`/play/${pairing.game.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        View Game
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
