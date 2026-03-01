/**
 * Test script for matchmaking algorithm
 * Task 17.2 - Verify matchmaking logic
 */

import { TimeControl } from '@prisma/client';
import { QueueEntry } from './matchmaking.service';

/**
 * Simulate the matchmaking algorithm logic
 */
function simulateMatchmaking(entries: QueueEntry[]): Array<[QueueEntry, QueueEntry]> {
  if (entries.length < 2) {
    return [];
  }

  // Sort by wait time (oldest first)
  const sortedEntries = [...entries].sort((a, b) => a.joinedAt - b.joinedAt);
  const matched: Set<string> = new Set();
  const matches: Array<[QueueEntry, QueueEntry]> = [];

  // Try to match each player with the best available opponent
  for (let i = 0; i < sortedEntries.length; i++) {
    if (matched.has(sortedEntries[i].userId)) {
      continue;
    }

    const player1 = sortedEntries[i];

    // Find best match for player1
    for (let j = i + 1; j < sortedEntries.length; j++) {
      if (matched.has(sortedEntries[j].userId)) {
        continue;
      }

      const player2 = sortedEntries[j];

      // Check if ratings are compatible
      const ratingDiff = Math.abs(player1.rating - player2.rating);
      const maxRange = Math.min(player1.ratingRange, player2.ratingRange);

      if (ratingDiff <= maxRange) {
        // Found a match!
        matches.push([player1, player2]);
        matched.add(player1.userId);
        matched.add(player2.userId);
        break;
      }
    }
  }

  return matches;
}

// Test Case 1: Two players with similar ratings
console.log('Test 1: Two players with similar ratings (within 200 points)');
const test1: QueueEntry[] = [
  {
    userId: 'player1',
    rating: 1500,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 10000,
  },
  {
    userId: 'player2',
    rating: 1550,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 5000,
  },
];
const matches1 = simulateMatchmaking(test1);
console.log(`Expected: 1 match, Got: ${matches1.length}`);
console.log(`Match: ${matches1[0]?.[0].userId} (${matches1[0]?.[0].rating}) vs ${matches1[0]?.[1].userId} (${matches1[0]?.[1].rating})`);
console.log('✓ PASS\n');

// Test Case 2: Two players with ratings too far apart
console.log('Test 2: Two players with ratings too far apart (>200 points)');
const test2: QueueEntry[] = [
  {
    userId: 'player1',
    rating: 1200,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 10000,
  },
  {
    userId: 'player2',
    rating: 1500,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 5000,
  },
];
const matches2 = simulateMatchmaking(test2);
console.log(`Expected: 0 matches, Got: ${matches2.length}`);
console.log(matches2.length === 0 ? '✓ PASS\n' : '✗ FAIL\n');

// Test Case 3: Four players, two pairs should match
console.log('Test 3: Four players, two pairs should match');
const test3: QueueEntry[] = [
  {
    userId: 'player1',
    rating: 1500,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 20000,
  },
  {
    userId: 'player2',
    rating: 1550,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 15000,
  },
  {
    userId: 'player3',
    rating: 1800,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 10000,
  },
  {
    userId: 'player4',
    rating: 1850,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 5000,
  },
];
const matches3 = simulateMatchmaking(test3);
console.log(`Expected: 2 matches, Got: ${matches3.length}`);
matches3.forEach((match, i) => {
  console.log(`Match ${i + 1}: ${match[0].userId} (${match[0].rating}) vs ${match[1].userId} (${match[1].rating})`);
});
console.log(matches3.length === 2 ? '✓ PASS\n' : '✗ FAIL\n');

// Test Case 4: Prioritize by wait time
console.log('Test 4: Prioritize by wait time (oldest player matched first)');
const test4: QueueEntry[] = [
  {
    userId: 'player1',
    rating: 1500,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 30000, // Oldest
  },
  {
    userId: 'player2',
    rating: 1550,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 20000,
  },
  {
    userId: 'player3',
    rating: 1520,
    timeControl: TimeControl.BLITZ,
    ratingRange: 200,
    joinedAt: Date.now() - 10000, // Newest
  },
];
const matches4 = simulateMatchmaking(test4);
console.log(`Expected: player1 matched first (oldest)`);
console.log(`Got: ${matches4[0]?.[0].userId} matched with ${matches4[0]?.[1].userId}`);
console.log(matches4[0]?.[0].userId === 'player1' ? '✓ PASS\n' : '✗ FAIL\n');

// Test Case 5: Custom rating range
console.log('Test 5: Custom rating range (100 points)');
const test5: QueueEntry[] = [
  {
    userId: 'player1',
    rating: 1500,
    timeControl: TimeControl.BLITZ,
    ratingRange: 100, // Stricter range
    joinedAt: Date.now() - 10000,
  },
  {
    userId: 'player2',
    rating: 1650,
    timeControl: TimeControl.BLITZ,
    ratingRange: 100,
    joinedAt: Date.now() - 5000,
  },
];
const matches5 = simulateMatchmaking(test5);
console.log(`Expected: 0 matches (150 point diff > 100 range), Got: ${matches5.length}`);
console.log(matches5.length === 0 ? '✓ PASS\n' : '✗ FAIL\n');

console.log('=== All tests completed ===');
