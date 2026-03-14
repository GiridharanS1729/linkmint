const GLOBAL_KEY = 'rbac:global';
const USER_PREFIX = 'rbac:user:';
const GUEST_KEY = 'rbac:guest';

export const RBAC_ROUTES = [
  { key: 'POST:/api/url', method: 'POST', path: '/api/url', label: 'Create short URL' },
  { key: 'GET:/api/myurls', method: 'GET', path: '/api/myurls', label: 'List own URLs' },
  { key: 'PUT:/api/url/:id', method: 'PUT', path: '/api/url/:id', label: 'Update URL' },
  { key: 'DELETE:/api/url/:id', method: 'DELETE', path: '/api/url/:id', label: 'Delete URL' },
  { key: 'GET:/api/url/:id/analytics', method: 'GET', path: '/api/url/:id/analytics', label: 'URL analytics' },
  { key: 'GET:/api/all', method: 'GET', path: '/api/all', label: 'Admin all data' },
  { key: 'GET:/api/users', method: 'GET', path: '/api/users', label: 'Admin users' },
  { key: 'GET:/api/admin/system', method: 'GET', path: '/api/admin/system', label: 'Admin system status' },
  { key: 'GET:/api/admin/docs', method: 'GET', path: '/api/admin/docs', label: 'Admin API docs' },
  { key: 'GET:/api/admin/rbac', method: 'GET', path: '/api/admin/rbac', label: 'Admin RBAC list' },
  { key: 'PUT:/api/admin/rbac/global', method: 'PUT', path: '/api/admin/rbac/global', label: 'Admin RBAC global update' },
  { key: 'PUT:/api/admin/rbac/guest', method: 'PUT', path: '/api/admin/rbac/guest', label: 'Admin RBAC guest update' },
  { key: 'PUT:/api/admin/rbac/user/:id', method: 'PUT', path: '/api/admin/rbac/user/:id', label: 'Admin RBAC per-user update' },
  { key: 'GET:/api/admin/rate-limits', method: 'GET', path: '/api/admin/rate-limits', label: 'Admin rate limit list' },
  { key: 'PUT:/api/admin/rate-limits/guest', method: 'PUT', path: '/api/admin/rate-limits/guest', label: 'Admin guest rate limit update' },
  { key: 'PUT:/api/admin/rate-limits/user/:id', method: 'PUT', path: '/api/admin/rate-limits/user/:id', label: 'Admin user rate limit update' },
];

function boolFromString(value) {
  if (value == null) return null;
  return String(value) === '1';
}

function pathToKey(method, path) {
  return `${String(method).toUpperCase()}:${path}`;
}

export function getRouteKey(request) {
  const routePath = request.routeOptions?.url || request.routerPath || request.url.split('?')[0];
  return pathToKey(request.method, routePath);
}

export async function setGlobalAccess(redis, routeKey, allowed) {
  await redis.hset(GLOBAL_KEY, routeKey, allowed ? '1' : '0');
}

export async function setUserAccess(redis, userId, routeKey, allowed) {
  await redis.hset(`${USER_PREFIX}${userId}`, routeKey, allowed ? '1' : '0');
}

export async function setGuestAccess(redis, routeKey, allowed) {
  await redis.hset(GUEST_KEY, routeKey, allowed ? '1' : '0');
}

export async function removeUserAccess(redis, userId, routeKey) {
  await redis.hdel(`${USER_PREFIX}${userId}`, routeKey);
}

export async function getGlobalPolicies(redis) {
  const map = await redis.hgetall(GLOBAL_KEY);
  return map;
}

export async function getUserPolicies(redis, userId) {
  return redis.hgetall(`${USER_PREFIX}${userId}`);
}

export async function getGuestPolicies(redis) {
  return redis.hgetall(GUEST_KEY);
}

export async function isRouteAllowed(redis, userId, routeKey) {
  try {
    if (userId == null) {
      const guestValue = await redis.hget(GUEST_KEY, routeKey);
      const parsedGuest = boolFromString(guestValue);
      if (parsedGuest != null) return parsedGuest;
    } else {
      const userValue = await redis.hget(`${USER_PREFIX}${userId}`, routeKey);
      const parsedUser = boolFromString(userValue);
      if (parsedUser != null) return parsedUser;
    }

    const globalValue = await redis.hget(GLOBAL_KEY, routeKey);
    const parsedGlobal = boolFromString(globalValue);
    if (parsedGlobal != null) return parsedGlobal;
    return true;
  } catch {
    return true;
  }
}
