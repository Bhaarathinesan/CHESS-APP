#!/usr/bin/env node

/**
 * Generate a secure random secret for environment variables
 * Usage: node scripts/generate-secret.js [length]
 */

const crypto = require('crypto');

// Get length from command line argument or default to 32
const length = parseInt(process.argv[2]) || 32;

if (length < 16) {
  console.error('Error: Secret length must be at least 16 characters');
  process.exit(1);
}

// Generate random bytes and convert to hex
const secret = crypto.randomBytes(length).toString('hex');

console.log('\n=== Generated Secret ===');
console.log(secret);
console.log('\nLength:', secret.length, 'characters');
console.log('\nUse this for JWT_SECRET, NEXTAUTH_SECRET, or other secret keys.');
console.log('IMPORTANT: Keep this secret secure and never commit it to version control!\n');
