const USER_LIMITS_KEY = 'ratelimit:url:user-limits';
const GUEST_LIMIT_KEY = 'ratelimit:url:guest-limit';

export const DEFAULT_URL_LIMIT_PER_MINUTE = 10;
const WINDOW_SECONDS = 60;

function toPositiveInt(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.floor(num);
}

export async function getUserUrlLimit(redis, userId) {
  const raw = await redis.hget(USER_LIMITS_KEY, String(userId));
  return toPositiveInt(raw, DEFAULT_URL_LIMIT_PER_MINUTE);
}

export async function setUserUrlLimit(redis, userId, maxPerMinute) {
  await redis.hset(USER_LIMITS_KEY, String(userId), String(toPositiveInt(maxPerMinute, DEFAULT_URL_LIMIT_PER_MINUTE)));
}

export async function clearUserUrlLimit(redis, userId) {
  await redis.hdel(USER_LIMITS_KEY, String(userId));
}

export async function getAllUserUrlLimits(redis) {
  const raw = await redis.hgetall(USER_LIMITS_KEY);
  const parsed = {};
  for (const [key, value] of Object.entries(raw || {})) {
    parsed[key] = toPositiveInt(value, DEFAULT_URL_LIMIT_PER_MINUTE);
  }
  return parsed;
}

export async function getGuestUrlLimit(redis) {
  const raw = await redis.get(GUEST_LIMIT_KEY);
  return toPositiveInt(raw, DEFAULT_URL_LIMIT_PER_MINUTE);
}

export async function setGuestUrlLimit(redis, maxPerMinute) {
  await redis.set(GUEST_LIMIT_KEY, String(toPositiveInt(maxPerMinute, DEFAULT_URL_LIMIT_PER_MINUTE)));
}

export async function consumeUrlRate(redis, bucketKey, limitPerMinute) {
  if (limitPerMinute < 0) return { allowed: true, remaining: null };
  if (limitPerMinute === 0) return { allowed: false, remaining: 0 };

  const count = await redis.incr(bucketKey);
  if (count === 1) {
    await redis.expire(bucketKey, WINDOW_SECONDS);
  }

  return {
    allowed: count <= limitPerMinute,
    remaining: Math.max(limitPerMinute - count, 0),
  };
}

