import Redis from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on('error', (error) => {
  console.error('Redis error:', error.message);
});

export async function redisGetSafe(key) {
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function redisSetSafe(key, value, ttlSeconds) {
  try {
    if (typeof ttlSeconds === 'number' && ttlSeconds > 0) {
      await redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

export async function redisDelSafe(key) {
  try {
    await redis.del(key);
    return true;
  } catch {
    return false;
  }
}

export async function redisPingSafe() {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}
