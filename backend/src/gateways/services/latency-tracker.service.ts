import { Injectable, Logger } from '@nestjs/common';
import { MoveLatencyDto } from '../dto/move-message.dto';

/**
 * Service for tracking and monitoring move transmission latency
 * Task 14.5: Move transmission with latency optimization
 * 
 * Requirements:
 * - 6.1: Transmit moves within 100ms
 * - 26.2: Maximum 100ms latency
 */
@Injectable()
export class LatencyTrackerService {
  private readonly logger = new Logger(LatencyTrackerService.name);
  
  // Store recent latency measurements for monitoring
  private recentLatencies: number[] = [];
  private readonly maxSamples = 1000;
  
  // Latency thresholds (in milliseconds)
  private readonly WARNING_THRESHOLD = 80; // Warn at 80ms
  private readonly ERROR_THRESHOLD = 100; // Error at 100ms
  
  // Statistics
  private totalMoves = 0;
  private slowMoves = 0; // Moves > 100ms
  private warningMoves = 0; // Moves > 80ms

  /**
   * Track a move's latency
   */
  trackMoveLatency(latency: MoveLatencyDto, gameId: string): void {
    const totalTime = latency.totalServerTime;
    
    // Add to recent samples
    this.recentLatencies.push(totalTime);
    if (this.recentLatencies.length > this.maxSamples) {
      this.recentLatencies.shift();
    }
    
    // Update statistics
    this.totalMoves++;
    
    if (totalTime > this.ERROR_THRESHOLD) {
      this.slowMoves++;
      this.logger.warn(
        `SLOW MOVE DETECTED in game ${gameId}: ${totalTime}ms ` +
        `(validation: ${latency.validationTime}ms, broadcast: ${latency.broadcastTime}ms)`
      );
    } else if (totalTime > this.WARNING_THRESHOLD) {
      this.warningMoves++;
      this.logger.debug(
        `Move approaching threshold in game ${gameId}: ${totalTime}ms`
      );
    }
    
    // Log detailed breakdown for slow moves
    if (totalTime > this.ERROR_THRESHOLD) {
      this.logger.warn(
        `Latency breakdown - Validation: ${latency.validationTime}ms, ` +
        `Broadcast: ${latency.broadcastTime}ms, ` +
        `Total: ${totalTime}ms`
      );
    }
  }

  /**
   * Get latency statistics
   */
  getStatistics() {
    if (this.recentLatencies.length === 0) {
      return {
        totalMoves: this.totalMoves,
        slowMoves: this.slowMoves,
        warningMoves: this.warningMoves,
        slowMovePercentage: 0,
        recentSamples: 0,
        avgLatency: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        max: 0,
        min: 0,
      };
    }
    
    const sorted = [...this.recentLatencies].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    
    return {
      totalMoves: this.totalMoves,
      slowMoves: this.slowMoves,
      warningMoves: this.warningMoves,
      slowMovePercentage: (this.slowMoves / this.totalMoves) * 100,
      recentSamples: sorted.length,
      avgLatency: sum / sorted.length,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      max: sorted[sorted.length - 1],
      min: sorted[0],
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStatistics(): void {
    this.recentLatencies = [];
    this.totalMoves = 0;
    this.slowMoves = 0;
    this.warningMoves = 0;
  }

  /**
   * Check if latency is within acceptable range
   */
  isLatencyAcceptable(latencyMs: number): boolean {
    return latencyMs <= this.ERROR_THRESHOLD;
  }

  /**
   * Get health status based on recent latencies
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    stats: ReturnType<typeof this.getStatistics>;
  } {
    const stats = this.getStatistics();
    
    if (stats.recentSamples === 0) {
      return {
        status: 'healthy',
        message: 'No recent data',
        stats,
      };
    }
    
    // Unhealthy if >10% of moves are slow
    if (stats.slowMovePercentage > 10) {
      return {
        status: 'unhealthy',
        message: `${stats.slowMovePercentage.toFixed(1)}% of moves exceed 100ms threshold`,
        stats,
      };
    }
    
    // Degraded if p95 is above 80ms
    if (stats.p95 > this.WARNING_THRESHOLD) {
      return {
        status: 'degraded',
        message: `P95 latency is ${stats.p95.toFixed(1)}ms (warning threshold: ${this.WARNING_THRESHOLD}ms)`,
        stats,
      };
    }
    
    return {
      status: 'healthy',
      message: `P95 latency is ${stats.p95.toFixed(1)}ms`,
      stats,
    };
  }
}
