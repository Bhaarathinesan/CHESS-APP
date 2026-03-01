export class QueueStatusDto {
  inQueue: boolean;
  position?: number;
  estimatedWaitTime?: number; // in seconds
  timeControl?: string;
  queueId?: string;
}

export class QueueJoinedDto {
  queueId: string;
  position: number;
  estimatedWaitTime: number;
  timeControl: string;
}

export class MatchFoundDto {
  gameId: string;
  opponent: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    rating: number | null;
  };
  color: 'white' | 'black';
  timeControl: string;
  initialTimeMinutes: number;
  incrementSeconds: number;
}
