import { UserRole } from './common.types';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  city?: string;
  collegeName: string;
  collegeDomain: string;
  role: UserRole;
  emailVerified: boolean;
  isOnline: boolean;
  lastOnline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  bulletRating?: number;
  blitzRating?: number;
  rapidRating?: number;
  classicalRating?: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
}
