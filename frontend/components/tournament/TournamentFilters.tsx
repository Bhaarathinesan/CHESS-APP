'use client';

import React from 'react';

interface TournamentFiltersProps {
  filters: {
    status?: string;
    format?: string;
    timeControl?: string;
    search?: string;
  };
  onFilterChange: (filters: any) => void;
}

export const TournamentFilters: React.FC<TournamentFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  return (
    <div className="bg-background-secondary border border-border rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Search
          </label>
          <input
            type="text"
            placeholder="Tournament name..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Status
          </label>
          <select
            value={filters.status || 'all'}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Statuses</option>
            <option value="REGISTRATION_OPEN">Open for Registration</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Format Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Format
          </label>
          <select
            value={filters.format || 'all'}
            onChange={(e) => handleChange('format', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Formats</option>
            <option value="SWISS">Swiss</option>
            <option value="ROUND_ROBIN">Round Robin</option>
            <option value="SINGLE_ELIMINATION">Single Elimination</option>
            <option value="DOUBLE_ELIMINATION">Double Elimination</option>
            <option value="ARENA">Arena</option>
          </select>
        </div>

        {/* Time Control Filter */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Time Control
          </label>
          <select
            value={filters.timeControl || 'all'}
            onChange={(e) => handleChange('timeControl', e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Time Controls</option>
            <option value="BULLET">Bullet</option>
            <option value="BLITZ">Blitz</option>
            <option value="RAPID">Rapid</option>
            <option value="CLASSICAL">Classical</option>
          </select>
        </div>
      </div>
    </div>
  );
};
