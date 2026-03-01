import { Injectable } from '@nestjs/common';

/**
 * ProfanityFilterService
 * Filters profanity and inappropriate language from chat messages
 * Requirement 19.6: Filter profanity and inappropriate language
 */
@Injectable()
export class ProfanityFilterService {
  // Common profanity words list (basic implementation)
  // In production, use a comprehensive library like 'bad-words' or 'leo-profanity'
  private readonly profanityList = new Set([
    'damn', 'hell', 'crap', 'shit', 'fuck', 'bitch', 'ass', 'bastard',
    'dick', 'piss', 'cock', 'pussy', 'whore', 'slut', 'fag', 'nigger',
    'retard', 'idiot', 'moron', 'stupid', 'dumb', 'loser', 'noob',
    // Add more words as needed
  ]);

  // Patterns for leetspeak and variations
  private readonly leetSpeakMap: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '@': 'a',
    '$': 's',
  };

  /**
   * Check if a message contains profanity
   * @param message - The message to check
   * @returns true if profanity is detected
   */
  containsProfanity(message: string): boolean {
    const normalized = this.normalizeMessage(message);
    const words = normalized.split(/\s+/);

    for (const word of words) {
      if (this.profanityList.has(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Filter profanity from a message by replacing with asterisks
   * @param message - The message to filter
   * @returns The filtered message
   */
  filterProfanity(message: string): string {
    const words = message.split(/(\s+)/); // Split but keep whitespace
    const normalized = this.normalizeMessage(message);
    const normalizedWords = normalized.split(/\s+/);

    let wordIndex = 0;
    const filtered = words.map((word) => {
      // Skip whitespace
      if (/^\s+$/.test(word)) {
        return word;
      }

      const normalizedWord = normalizedWords[wordIndex];
      wordIndex++;

      if (this.profanityList.has(normalizedWord)) {
        // Replace with asterisks, keeping first and last character
        if (word.length <= 2) {
          return '*'.repeat(word.length);
        }
        return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
      }

      return word;
    });

    return filtered.join('');
  }

  /**
   * Normalize message for profanity detection
   * Handles leetspeak, special characters, and case
   * @param message - The message to normalize
   * @returns Normalized message
   */
  private normalizeMessage(message: string): string {
    let normalized = message.toLowerCase();

    // Replace leetspeak characters
    for (const [leet, normal] of Object.entries(this.leetSpeakMap)) {
      normalized = normalized.replace(new RegExp(leet, 'g'), normal);
    }

    // Remove special characters except spaces
    normalized = normalized.replace(/[^a-z0-9\s]/g, '');

    // Remove extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Get severity level of profanity in message
   * @param message - The message to check
   * @returns Severity level: 'none', 'mild', 'moderate', 'severe'
   */
  getSeverity(message: string): 'none' | 'mild' | 'moderate' | 'severe' {
    const normalized = this.normalizeMessage(message);
    const words = normalized.split(/\s+/);

    const severeProfanity = ['fuck', 'shit', 'bitch', 'nigger', 'fag'];
    const moderateProfanity = ['damn', 'hell', 'ass', 'dick', 'cock'];

    for (const word of words) {
      if (severeProfanity.includes(word)) {
        return 'severe';
      }
      if (moderateProfanity.includes(word)) {
        return 'moderate';
      }
      if (this.profanityList.has(word)) {
        return 'mild';
      }
    }

    return 'none';
  }
}
