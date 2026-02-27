export type TimeControl = 'bullet' | 'blitz' | 'rapid' | 'classical';

export type UserRole = 'super_admin' | 'tournament_admin' | 'player' | 'spectator';

export type GameStatus = 'pending' | 'active' | 'completed' | 'aborted';

export type GameResult = 'white_win' | 'black_win' | 'draw' | null;

export type TerminationReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'draw_agreement'
  | 'stalemate'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'insufficient_material';

export interface TimeControlConfig {
  initialTimeMinutes: number;
  incrementSeconds: number;
}
