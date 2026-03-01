import { Injectable, BadRequestException } from '@nestjs/common';
import { TournamentStatus } from '@prisma/client';

/**
 * Tournament State Machine Service
 * Manages valid tournament status transitions
 * Requirements: 10.1-10.7
 */

// Define valid state transitions
const VALID_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  [TournamentStatus.CREATED]: [
    TournamentStatus.REGISTRATION_OPEN,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.REGISTRATION_OPEN]: [
    TournamentStatus.REGISTRATION_CLOSED,
    TournamentStatus.IN_PROGRESS, // Direct start if auto-start enabled
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.REGISTRATION_CLOSED]: [
    TournamentStatus.IN_PROGRESS,
    TournamentStatus.CANCELLED,
  ],
  [TournamentStatus.IN_PROGRESS]: [
    TournamentStatus.ROUND_IN_PROGRESS,
    TournamentStatus.COMPLETED,
  ],
  [TournamentStatus.ROUND_IN_PROGRESS]: [
    TournamentStatus.ROUND_COMPLETED,
    TournamentStatus.IN_PROGRESS, // Pause
  ],
  [TournamentStatus.ROUND_COMPLETED]: [
    TournamentStatus.ROUND_IN_PROGRESS, // Next round
    TournamentStatus.COMPLETED,
  ],
  [TournamentStatus.COMPLETED]: [], // Terminal state
  [TournamentStatus.CANCELLED]: [], // Terminal state
};

@Injectable()
export class TournamentStateMachineService {
  /**
   * Validate if a status transition is allowed
   * @param currentStatus Current tournament status
   * @param newStatus Desired new status
   * @returns true if transition is valid
   * @throws BadRequestException if transition is invalid
   */
  validateTransition(
    currentStatus: TournamentStatus,
    newStatus: TournamentStatus,
  ): boolean {
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
      );
    }

    return true;
  }

  /**
   * Check if a status is a terminal state (no further transitions allowed)
   * @param status Tournament status to check
   * @returns true if status is terminal
   */
  isTerminalState(status: TournamentStatus): boolean {
    return (
      status === TournamentStatus.COMPLETED ||
      status === TournamentStatus.CANCELLED
    );
  }

  /**
   * Check if tournament can be cancelled from current status
   * @param status Current tournament status
   * @returns true if cancellation is allowed
   */
  canBeCancelled(status: TournamentStatus): boolean {
    return (
      status === TournamentStatus.CREATED ||
      status === TournamentStatus.REGISTRATION_OPEN ||
      status === TournamentStatus.REGISTRATION_CLOSED
    );
  }

  /**
   * Check if tournament can be started from current status
   * @param status Current tournament status
   * @returns true if start is allowed
   */
  canBeStarted(status: TournamentStatus): boolean {
    return (
      status === TournamentStatus.REGISTRATION_OPEN ||
      status === TournamentStatus.REGISTRATION_CLOSED
    );
  }

  /**
   * Check if tournament is in an active state (can have ongoing games)
   * @param status Current tournament status
   * @returns true if tournament is active
   */
  isActive(status: TournamentStatus): boolean {
    return (
      status === TournamentStatus.IN_PROGRESS ||
      status === TournamentStatus.ROUND_IN_PROGRESS ||
      status === TournamentStatus.ROUND_COMPLETED
    );
  }

  /**
   * Check if players can join the tournament
   * @param status Current tournament status
   * @param allowLateRegistration Whether late registration is enabled
   * @returns true if joining is allowed
   */
  canJoin(status: TournamentStatus, allowLateRegistration: boolean): boolean {
    if (status === TournamentStatus.REGISTRATION_OPEN) {
      return true;
    }

    if (allowLateRegistration && status === TournamentStatus.IN_PROGRESS) {
      return true;
    }

    return false;
  }

  /**
   * Check if players can leave the tournament
   * @param status Current tournament status
   * @returns true if leaving is allowed
   */
  canLeave(status: TournamentStatus): boolean {
    return (
      status === TournamentStatus.CREATED ||
      status === TournamentStatus.REGISTRATION_OPEN ||
      status === TournamentStatus.REGISTRATION_CLOSED
    );
  }

  /**
   * Get all valid next states from current status
   * @param status Current tournament status
   * @returns Array of valid next statuses
   */
  getValidNextStates(status: TournamentStatus): TournamentStatus[] {
    return VALID_TRANSITIONS[status] || [];
  }
}
