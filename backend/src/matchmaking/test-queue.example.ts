/**
 * Example usage of Matchmaking Queue Service
 * This file demonstrates how to use the queue service
 * 
 * NOT FOR PRODUCTION - Example only
 */

import { TimeControl } from '@prisma/client';
import { MatchmakingService } from './matchmaking.service';

async function exampleUsage(service: MatchmakingService) {
  console.log('=== Matchmaking Queue Service Example ===\n');

  // Example 1: Join queue
  console.log('1. User joins BLITZ queue');
  const status1 = await service.joinQueue('user-1', TimeControl.BLITZ, 200);
  console.log('Status:', status1);
  // Output: { position: 1, waitTimeSeconds: 0, queueSize: 1 }

  // Example 2: Another user joins same queue
  console.log('\n2. Another user joins BLITZ queue');
  const status2 = await service.joinQueue('user-2', TimeControl.BLITZ, 200);
  console.log('Status:', status2);
  // Output: { position: 2, waitTimeSeconds: 0, queueSize: 2 }

  // Example 3: Check queue status
  console.log('\n3. Check first user status after 5 seconds');
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const updated = await service.getQueueStatus('user-1', TimeControl.BLITZ);
  console.log('Updated status:', updated);
  // Output: { position: 1, waitTimeSeconds: 5, queueSize: 2 }

  // Example 4: Get all queue entries
  console.log('\n4. Get all entries in BLITZ queue');
  const entries = await service.getQueueEntries(TimeControl.BLITZ);
  console.log('Queue entries:', entries);
  // Output: Array of QueueEntry objects

  // Example 5: User leaves queue
  console.log('\n5. First user leaves queue');
  const removed = await service.leaveQueue('user-1');
  console.log('Removed:', removed);
  // Output: true

  // Example 6: Check remaining queue
  console.log('\n6. Check second user status after first leaves');
  const final = await service.getQueueStatus('user-2', TimeControl.BLITZ);
  console.log('Final status:', final);
  // Output: { position: 1, waitTimeSeconds: ~5, queueSize: 1 }

  // Example 7: Try to join multiple queues (should fail)
  console.log('\n7. Try to join RAPID queue while in BLITZ');
  try {
    await service.joinQueue('user-2', TimeControl.RAPID, 200);
  } catch (error) {
    console.log('Error (expected):', error.message);
    // Output: "User is already in BLITZ queue"
  }

  // Cleanup
  console.log('\n8. Cleanup - leave queue');
  await service.leaveQueue('user-2');
  console.log('Done!');
}

/**
 * Example: Multiple time controls
 */
async function multipleTimeControlsExample(service: MatchmakingService) {
  console.log('\n=== Multiple Time Controls Example ===\n');

  // Users can be in different queues
  await service.joinQueue('user-1', TimeControl.BULLET);
  await service.joinQueue('user-2', TimeControl.BLITZ);
  await service.joinQueue('user-3', TimeControl.RAPID);
  await service.joinQueue('user-4', TimeControl.CLASSICAL);

  console.log('User 1 queue:', await service.getUserQueue('user-1')); // BULLET
  console.log('User 2 queue:', await service.getUserQueue('user-2')); // BLITZ
  console.log('User 3 queue:', await service.getUserQueue('user-3')); // RAPID
  console.log('User 4 queue:', await service.getUserQueue('user-4')); // CLASSICAL

  // Cleanup
  await service.clearAllQueues();
}

/**
 * Example: Rating-based queue
 */
async function ratingExample(service: MatchmakingService) {
  console.log('\n=== Rating-Based Queue Example ===\n');

  // Users with different ratings join
  // (Ratings are fetched from database automatically)
  await service.joinQueue('beginner-user', TimeControl.BLITZ, 200);
  await service.joinQueue('intermediate-user', TimeControl.BLITZ, 200);
  await service.joinQueue('advanced-user', TimeControl.BLITZ, 200);

  // Get all entries to see ratings
  const entries = await service.getQueueEntries(TimeControl.BLITZ);
  console.log('Queue with ratings:');
  entries.forEach((entry, index) => {
    console.log(
      `  ${index + 1}. ${entry.userId} - Rating: ${entry.rating} (±${entry.ratingRange})`,
    );
  });

  // Cleanup
  await service.clearAllQueues();
}

// Export for testing
export { exampleUsage, multipleTimeControlsExample, ratingExample };
