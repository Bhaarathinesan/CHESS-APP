export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
        <p className="text-foreground-secondary mt-2">
          View and edit your profile information
        </p>
      </div>

      {/* Profile Header */}
      <div className="bg-background-secondary border border-border rounded-lg p-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-secondary-foreground text-3xl font-bold">U</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">Guest User</h2>
            <p className="text-foreground-secondary">guest@example.com</p>
            <div className="flex gap-4 mt-4">
              <div>
                <p className="text-sm text-foreground-secondary">Rating</p>
                <p className="text-lg font-semibold text-foreground">1200</p>
              </div>
              <div>
                <p className="text-sm text-foreground-secondary">Games</p>
                <p className="text-lg font-semibold text-foreground">0</p>
              </div>
              <div>
                <p className="text-sm text-foreground-secondary">Win Rate</p>
                <p className="text-lg font-semibold text-foreground">0%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Bullet', rating: 1200 },
          { label: 'Blitz', rating: 1200 },
          { label: 'Rapid', rating: 1200 },
          { label: 'Classical', rating: 1200 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-background-secondary border border-border rounded-lg p-4"
          >
            <p className="text-sm text-foreground-secondary">{stat.label}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{stat.rating}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
