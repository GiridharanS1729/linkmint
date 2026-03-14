import { redisPingSafe } from './redis.js';
import { RBAC_ROUTES } from './rbac.js';

export const API_CATALOG = [
  { method: 'GET', path: '/', auth: 'public', description: 'Service info and quick status' },
  { method: 'GET', path: '/health', auth: 'public', description: 'Detailed dependency health' },
  { method: 'POST', path: '/api/auth/request-otp', auth: 'public', description: 'Request OTP email' },
  { method: 'POST', path: '/api/auth/verify-otp', auth: 'public', description: 'Verify OTP and login' },
  { method: 'POST', path: '/api/auth/google', auth: 'public', description: 'Google token login/signup' },
  { method: 'POST', path: '/api/login', auth: 'public', description: 'Password login' },
  { method: 'POST', path: '/api/signup', auth: 'public', description: 'Password signup' },
  { method: 'POST', path: '/api/refresh', auth: 'public(cookie)', description: 'Refresh access token' },
  { method: 'POST', path: '/api/logout', auth: 'public(cookie)', description: 'Clear refresh cookie' },
  { method: 'POST', path: '/api/url', auth: 'guest/user', description: 'Create short URL' },
  { method: 'GET', path: '/api/myurls', auth: 'user', description: 'Get user URLs' },
  { method: 'GET', path: '/api/url/:id/analytics', auth: 'user/admin', description: 'Get URL analytics' },
  { method: 'PUT', path: '/api/url/:id', auth: 'user/admin', description: 'Update short URL' },
  { method: 'DELETE', path: '/api/url/:id', auth: 'user/admin', description: 'Delete short URL' },
  { method: 'GET', path: '/api/all', auth: 'admin(signature)', description: 'List all users and URLs' },
  { method: 'GET', path: '/api/users', auth: 'admin(signature)', description: 'List all users' },
  { method: 'GET', path: '/api/admin/system', auth: 'admin(signature)', description: 'System/API status + metrics' },
  { method: 'GET', path: '/api/admin/docs', auth: 'admin(signature)', description: 'Swagger-like API catalog' },
  { method: 'GET', path: '/api/admin/rbac', auth: 'admin(signature)', description: 'Read RBAC policies' },
  { method: 'PUT', path: '/api/admin/rbac/global', auth: 'admin(signature)', description: 'Set global route access' },
  { method: 'PUT', path: '/api/admin/rbac/guest', auth: 'admin(signature)', description: 'Set guest route access' },
  { method: 'PUT', path: '/api/admin/rbac/user/:id', auth: 'admin(signature)', description: 'Set per-user route access' },
  { method: 'GET', path: '/:code', auth: 'public', description: '301 redirect by short code' },
];

export async function collectHealth(fastify) {
  let postgres = false;
  try {
    await fastify.prisma.$queryRaw`SELECT 1`;
    postgres = true;
  } catch {
    postgres = false;
  }

  const redis = await redisPingSafe();

  return {
    service: 'linkvio-api',
    time: new Date().toISOString(),
    status: postgres ? (redis ? 'ok' : 'degraded') : 'down',
    dependencies: {
      postgres: postgres ? 'ok' : 'down',
      redis: redis ? 'ok' : 'down',
    },
    apis: API_CATALOG.map((api) => ({
      ...api,
      status: 'registered',
    })),
    rbac_routes: RBAC_ROUTES,
  };
}
