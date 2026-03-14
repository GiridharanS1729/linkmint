const CORS_ORIGINS_KEY = 'cors:allowed-origins';

function parseOrigin(value) {
  if (!value) return null;
  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

export function parseDefaultOrigins(config) {
  return String(config.frontendOrigin || '')
    .split(',')
    .map((item) => parseOrigin(item.trim()))
    .filter(Boolean);
}

export async function listCustomOrigins(redis) {
  try {
    const entries = await redis.smembers(CORS_ORIGINS_KEY);
    return entries.map((item) => parseOrigin(item)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function addCustomOrigin(redis, origin) {
  const parsed = parseOrigin(origin);
  if (!parsed) throw new Error('Invalid origin');
  try {
    await redis.sadd(CORS_ORIGINS_KEY, parsed);
    return { ok: true, origin: parsed };
  } catch {
    return { ok: false, origin: parsed };
  }
}

export async function removeCustomOrigin(redis, origin) {
  const parsed = parseOrigin(origin);
  if (!parsed) throw new Error('Invalid origin');
  try {
    await redis.srem(CORS_ORIGINS_KEY, parsed);
    return { ok: true, origin: parsed };
  } catch {
    return { ok: false, origin: parsed };
  }
}

export async function getAllowedOrigins(config, redis) {
  const defaults = parseDefaultOrigins(config);
  const custom = await listCustomOrigins(redis);
  return Array.from(new Set([...defaults, ...custom]));
}

