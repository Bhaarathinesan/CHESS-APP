export default function TournamentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tournaments</h1>
          <p className="text-foreground-secondary mt-2">
            Browse and join chess tournaments
          </p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors">
          Create Tournament
        </button>
      </div>

      <div className="bg-background-secondary border border-border rounded-lg p-8 text-center">
        <p className="text-foreground-secondary">
          No tournaments available at the moment
        </p>
      </div>
    </div>
  );
}
