/**
 * Manual test script to verify Redis connection and basic operations
 * Run with: npx ts-node src/redis/test-redis.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { RedisService } from './redis.service';

async function testRedis() {
  console.log('🔧 Testing Redis Service...\n');

  const redis = new RedisService();

  try {
    // Test 1: Ping
    console.log('1. Testing connection (ping)...');
    const pong = await redis.ping();
    console.log(`   ✓ Ping response: ${pong}\n`);

    // Test 2: Set and Get
    console.log('2. Testing set and get...');
    await redis.set('test:hello', 'world');
    const value = await redis.get('test:hello');
    console.log(`   ✓ Set 'test:hello' = 'world'`);
    console.log(`   ✓ Get 'test:hello' = '${value}'\n`);

    // Test 3: Set with TTL
    console.log('3. Testing set with TTL...');
    await redis.set('test:expires', 'soon', 10);
    const ttl = await redis.ttl('test:expires');
    console.log(`   ✓ Set 'test:expires' with 10s TTL`);
    console.log(`   ✓ Remaining TTL: ${ttl}s\n`);

    // Test 4: JSON operations
    console.log('4. Testing JSON operations...');
    const testData = { name: 'Chess Arena', version: '1.0', active: true };
    await redis.setJson('test:json', testData);
    const jsonValue = await redis.getJson('test:json');
    console.log(`   ✓ Set JSON:`, testData);
    console.log(`   ✓ Get JSON:`, jsonValue);
    console.log(`   ✓ JSON match: ${JSON.stringify(testData) === JSON.stringify(jsonValue)}\n`);

    // Test 5: Delete
    console.log('5. Testing delete...');
    await redis.delete('test:hello');
    const deleted = await redis.get('test:hello');
    console.log(`   ✓ Deleted 'test:hello'`);
    console.log(`   ✓ Value after delete: ${deleted}\n`);

    // Test 6: Increment
    console.log('6. Testing increment...');
    await redis.set('test:counter', '0');
    const count1 = await redis.increment('test:counter');
    const count2 = await redis.increment('test:counter', 5);
    console.log(`   ✓ Increment by 1: ${count1}`);
    console.log(`   ✓ Increment by 5: ${count2}\n`);

    // Test 7: Exists
    console.log('7. Testing exists...');
    const exists1 = await redis.exists('test:json');
    const exists2 = await redis.exists('test:nonexistent');
    console.log(`   ✓ 'test:json' exists: ${exists1}`);
    console.log(`   ✓ 'test:nonexistent' exists: ${exists2}\n`);

    // Cleanup
    console.log('8. Cleaning up test keys...');
    const testKeys = await redis.keys('test:*');
    if (testKeys.length > 0) {
      await redis.deleteMany(testKeys);
      console.log(`   ✓ Deleted ${testKeys.length} test keys\n`);
    }

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await redis.onModuleDestroy();
    console.log('\n🔌 Redis connection closed');
  }
}

testRedis();
