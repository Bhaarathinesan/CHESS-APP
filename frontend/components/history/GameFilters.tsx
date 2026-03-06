'use client';

import { useState } from 'react';

export interface GameFiltersState {
  timeControl: string;
  result: string;
  opponentId: string;
  dateFrom: string;
  dateTo: string;
}

interface GameFiltersProps {
  filters: GameFiltersState;
  onFiltersChange: (filters: GameFiltersState) => void;
}

export default function GameFilters({ filters, onFiltersChange }: GameFiltersProps) {
  const handleChange = (key: keyof GameFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-background-secondary border border-border rounded-lg p-4">
      <h3 className="text-lg font-semibold text-foreground mb-4">Filters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Time Control Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            Time Control
          </label>
          <select
            value={filters.timeControl}
            onChange={(e) => handleChange('timeControl', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Time Controls</option>
            <option value="bullet">Bullet</option>
            <option value="blitz">Blitz</option>
            <option value="rapid">Rapid</option>
            <option value="classical">Classical</option>
          </select>
        </div>

        {/* Result Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            Result
          </label>
          <select
            value={filters.result}
            onChange={(e) => handleChange('result', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Results</option>
            <option value="win">Wins</option>
            <option value="loss">Losses</option>
            <option value="draw">Draws</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Clear Filters Button */}
      {(filters.timeControl || filters.result || filters.dateFrom || filters.dateTo) && (
        <button
          onClick={() => onFiltersChange({ timeControl: '', result: '', opponentId: '', dateFrom: '', dateTo: '' })}
          className="mt-4 px-4 py-2 text-sm text-primary hover:text-primary-dark transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
