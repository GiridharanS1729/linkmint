import Redis from 'ioredis';
import { config } from './config.js';

export const redis = new Redis(config.redisUrl);

redis.on('error', (error) => {
  console.error('Redis error:', error.message);
});
