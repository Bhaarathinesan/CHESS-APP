'use client';

import React, { useState } from 'react';
import { OverviewTab } from './tabs/OverviewTab';
import { GamesTab } from './tabs/GamesTab';
import { TournamentsTab } from './tabs/TournamentsTab';
import { StatsTab } from './tabs/StatsTab';

interface ProfileTabsProps {
  profile: any;
  userId: string;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({ profile, userId }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'games', label: 'Games' },
    { id: 'tournaments', label: 'Tournaments' },
    { id: 'stats', label: 'Statistics' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab profile={profile} userId={userId} />}
        {activeTab === 'games' && <GamesTab userId={userId} />}
        {activeTab === 'tournaments' && <TournamentsTab userId={userId} />}
        {activeTab === 'stats' && <StatsTab userId={userId} />}
      </div>
    </div>
  );
};
