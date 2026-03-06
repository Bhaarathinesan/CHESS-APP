/**
 * Achievement seed data for ChessArena
 * Based on Requirements 17.1-17.19
 */

export interface AchievementSeed {
  code: string;
  name: string;
  description: string;
  category: 'gameplay' | 'tournament' | 'rating' | 'social';
  points: number;
  isHidden: boolean;
  iconUrl?: string;
}

export const ACHIEVEMENT_SEEDS: AchievementSeed[] = [
  // Gameplay Achievements (Requirements 17.1-17.8)
  {
    code: 'first_victory',
    name: 'First Victory',
    description: 'Win your first game',
    category: 'gameplay',
    points: 10,
    isHidden: false,
  },
  {
    code: 'checkmate_master',
    name: 'Checkmate Master',
    description: 'Deliver checkmate in 100 games',
    category: 'gameplay',
    points: 100,
    isHidden: false,
  },
  {
    code: 'speed_demon',
    name: 'Speed Demon',
    description: 'Win a Bullet game',
    category: 'gameplay',
    points: 15,
    isHidden: false,
  },
  {
    code: 'marathon_runner',
    name: 'Marathon Runner',
    description: 'Complete a game lasting over 100 moves',
    category: 'gameplay',
    points: 25,
    isHidden: false,
  },
  {
    code: 'comeback_king',
    name: 'Comeback King',
    description: 'Win after being down material equivalent to a Queen',
    category: 'gameplay',
    points: 50,
    isHidden: false,
  },
  {
    code: 'scholars_mate',
    name: "Scholar's Mate",
    description: "Win by Scholar's Mate",
    category: 'gameplay',
    points: 20,
    isHidden: false,
  },
  {
    code: 'stalemate_artist',
    name: 'Stalemate Artist',
    description: 'Achieve stalemate',
    category: 'gameplay',
    points: 15,
    isHidden: false,
  },

  // Tournament Achievements (Requirements 17.9-17.12)
  {
    code: 'tournament_debut',
    name: 'Tournament Debut',
    description: 'Participate in your first tournament',
    category: 'tournament',
    points: 20,
    isHidden: false,
  },
  {
    code: 'podium_finish',
    name: 'Podium Finish',
    description: 'Finish in top 3 of a tournament',
    category: 'tournament',
    points: 50,
    isHidden: false,
  },
  {
    code: 'champion',
    name: 'Champion',
    description: 'Win a tournament',
    category: 'tournament',
    points: 100,
    isHidden: false,
  },
  {
    code: 'clean_sweep',
    name: 'Clean Sweep',
    description: 'Win a tournament without losing any games',
    category: 'tournament',
    points: 150,
    isHidden: false,
  },
  {
    code: 'iron_player',
    name: 'Iron Player',
    description: 'Complete 50 tournament games',
    category: 'tournament',
    points: 75,
    isHidden: false,
  },

  // Rating Achievements (Requirements 17.13-17.18)
  {
    code: 'giant_killer',
    name: 'Giant Killer',
    description: 'Defeat an opponent rated 200+ points higher',
    category: 'rating',
    points: 40,
    isHidden: false,
  },
  {
    code: 'rising_star',
    name: 'Rising Star',
    description: 'Reach 1400 rating',
    category: 'rating',
    points: 30,
    isHidden: false,
  },
  {
    code: 'club_player',
    name: 'Club Player',
    description: 'Reach 1600 rating',
    category: 'rating',
    points: 50,
    isHidden: false,
  },
  {
    code: 'expert',
    name: 'Expert',
    description: 'Reach 1800 rating',
    category: 'rating',
    points: 75,
    isHidden: false,
  },
  {
    code: 'master',
    name: 'Master',
    description: 'Reach 2000 rating',
    category: 'rating',
    points: 100,
    isHidden: false,
  },
  {
    code: 'grandmaster',
    name: 'Grandmaster',
    description: 'Reach 2200 rating',
    category: 'rating',
    points: 150,
    isHidden: false,
  },

  // Social Achievements (Requirement 17.19)
  {
    code: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Follow 10 other players',
    category: 'social',
    points: 20,
    isHidden: false,
  },
];
