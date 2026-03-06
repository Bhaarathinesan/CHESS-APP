export interface UserMetrics {
  totalUsers: number;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  newRegistrations: number;
}

export interface GameMetrics {
  totalGames: number;
  averageDuration: number;
  popularTimeControls: {
    timeControl: string;
    count: number;
    percentage: number;
  }[];
}

export interface UsageMetrics {
  peakUsageHours: {
    hour: number;
    count: number;
  }[];
  tournamentParticipationRate: number;
}

export interface ServerMetrics {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
}

export class DashboardResponseDto {
  userMetrics: UserMetrics;
  gameMetrics: GameMetrics;
  usageMetrics: UsageMetrics;
  serverMetrics: ServerMetrics;
}
