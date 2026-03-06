'use client';

import {
  QuickPlaySection,
  ActiveTournamentsSection,
  RecentGamesSection,
  NotificationsList,
  AnnouncementsBanner,
} from '@/components/dashboard';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-foreground-secondary mt-2">
          Welcome to ChessArena! Start playing or join a tournament.
        </p>
      </div>

      {/* Announcements Banner */}
      <AnnouncementsBanner />

      {/* Quick Play Section */}
      <QuickPlaySection />

      {/* Two Column Layout for Tournaments and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveTournamentsSection />
        <NotificationsList />
      </div>

      {/* Recent Games */}
      <RecentGamesSection />
    </div>
  );
}
