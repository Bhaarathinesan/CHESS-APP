import { UserRole } from '@prisma/client';

export class UserListItemDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  collegeName: string;
  collegeDomain: string;
  role: UserRole;
  emailVerified: boolean;
  isOnline: boolean;
  lastOnline: Date | null;
  isBanned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: Date;
}

export class UserListResponseDto {
  users: UserListItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
