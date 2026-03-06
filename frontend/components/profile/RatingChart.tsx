'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface RatingDataPoint {
  date: string;
  rating: number;
  change: number;
  timeControl: string;
}

interface RatingChartProps {
  data: RatingDataPoint[];
  timeControl: string;
  peakRating?: number;
}

export const RatingChart: React.FC<RatingChartProps> = ({
  data,
  timeControl,
  peakRating,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        No rating history available
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const timeControlColors: Record<string, string> = {
    BULLET: '#ef4444',
    BLITZ: '#3b82f6',
    RAPID: '#10b981',
    CLASSICAL: '#8b5cf6',
  };

  const color = timeControlColors[timeControl] || '#3b82f6';

  return (
    <div className="space-y-4">
      {peakRating && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Rating History
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Peak: <span className="font-bold text-gray-900 dark:text-white">{peakRating}</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            domain={['dataMin - 50', 'dataMax + 50']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
            labelFormatter={(label) => formatDate(label)}
            formatter={(value: number, name: string) => [
              value,
              name === 'rating' ? 'Rating' : name,
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="rating"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 4 }}
            activeDot={{ r: 6 }}
            name="Rating"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
