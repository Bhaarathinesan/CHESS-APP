export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Game History</h1>
        <p className="text-foreground-secondary mt-2">
          Review your past games and analyze your performance
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select className="px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground">
          <option>All Time Controls</option>
          <option>Bullet</option>
          <option>Blitz</option>
          <option>Rapid</option>
          <option>Classical</option>
        </select>
        <select className="px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground">
          <option>All Results</option>
          <option>Wins</option>
          <option>Losses</option>
          <option>Draws</option>
        </select>
      </div>

      <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
        <p className="text-foreground-secondary">
          No games in your history yet. Play your first game!
        </p>
      </div>
    </div>
  );
}
