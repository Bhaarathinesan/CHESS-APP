'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { RatingChart } from '../RatingChart';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface StatsTabProps {
  userId: string;
}

export const StatsTab: React.FC<StatsTabProps> = ({ userId }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('BLITZ');

  useEffect(() => {
    fetchStats();
  }, [userId, selectedTimeControl]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<any>(
        `/users/${userId}/stats?timeControl=${selectedTimeControl}`
      );
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No statistics available
      </div>
    );
  }

  const timeControls = [
    { value: 'BULLET', label: 'Bullet' },
    { value: 'BLITZ', label: 'Blitz' },
    { value: 'RAPID', label: 'Rapid' },
    { value: 'CLASSICAL', label: 'Classical' },
  ];

  // Prepare data for win/loss/draw pie chart
  const resultData = [
    { name: 'Wins', value: stats.wins, color: '#10b981' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
    { name: 'Draws', value: stats.draws, color: '#6b7280' },
  ];

  return (
    <div className="space-y-6">
      {/* Time Control Selector */}
      <div className="flex gap-2">
        {timeControls.map((tc) => (
          <button
            key={tc.value}
            onClick={() => setSelectedTimeControl(tc.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTimeControl === tc.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {tc.label}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Games</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.totalGames}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Streak</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.streaks?.currentWinStreak || 0}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Longest Streak</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.streaks?.longestWinStreak || 0}
          </p>
        </div>
      </div>

      {/* Rating History Chart */}
      {stats.ratingHistory && stats.ratingHistory.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <RatingChart
            data={stats.ratingHistory}
            timeControl={selectedTimeControl}
            peakRating={stats.performanceByTimeControl?.[selectedTimeControl.toLowerCase()]?.peakRating}
          />
        </div>
      )}

      {/* Win/Loss/Draw Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Game Results
          </h4>
          {stats.totalGames > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={resultData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {resultData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              No games played
            </div>
          )}
        </div>

        {/* Day of Week Performance */}
        {stats.dayOfWeekPerformance && stats.dayOfWeekPerformance.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance by Day
            </h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.dayOfWeekPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis
                  dataKey="day"
                  stroke="#9ca3af"
                  style={{ fontSize: '10px' }}
                  tickFormatter={(value) => value.substring(0, 3)}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="winRate" fill="#3b82f6" name="Win Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Opening Statistics */}
      {stats.openingStats && stats.openingStats.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Openings
          </h4>
          <div className="space-y-3">
            {stats.openingStats.slice(0, 5).map((opening: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {opening.opening}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {opening.gamesPlayed} games • {opening.wins}W {opening.losses}L {opening.draws}D
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {opening.winRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Management */}
      {stats.timeManagement && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Time Management
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Avg Time per Move
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {(stats.timeManagement.averageTimePerMove / 1000).toFixed(1)}s
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Moves
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.timeManagement.totalMoves}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Time Played
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {Math.floor(stats.timeManagement.totalTimeSpent / 3600000)}h
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Most Faced Opponents */}
      {stats.opponents && stats.opponents.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Most Faced Opponents
          </h4>
          <div className="space-y-3">
            {stats.opponents.slice(0, 5).map((opp: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {opp.opponent.displayName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {opp.total} games • {opp.wins}W {opp.losses}L {opp.draws}D
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {opp.winRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
