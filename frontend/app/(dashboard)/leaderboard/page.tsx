export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-foreground-secondary mt-2">
          Top players across all time controls
        </p>
      </div>

      {/* Time Control Tabs */}
      <div className="flex gap-2 border-b border-border">
        {['Bullet', 'Blitz', 'Rapid', 'Classical'].map((control) => (
          <button
            key={control}
            className="px-4 py-2 text-foreground-secondary hover:text-foreground border-b-2 border-transparent hover:border-primary transition-colors"
          >
            {control}
          </button>
        ))}
      </div>

      <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
        <p className="text-foreground-secondary">
          No players on the leaderboard yet
        </p>
      </div>
    </div>
  );
}
