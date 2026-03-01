import { IsUUID } from 'class-validator';

/**
 * DTO for creating a rematch offer
 * Requirements: 7.8
 */
export class CreateRematchDto {
  @IsUUID()
  gameId: string;
}
