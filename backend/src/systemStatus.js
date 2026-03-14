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
  { method: 'POST', path: '/api/me/apikey/regenerate', auth: 'user', description: 'Regenerate current user API key' },
  { method: 'POST', path: '/api/url', auth: 'guest/user', description: 'Create short URL' },
  { method: 'GET', path: '/api/myurls', auth: 'user', description: 'Get user URLs' },
  { method: 'GET', path: '/api/url/:id/analytics', auth: 'user/admin', description: 'Get URL analytics' },
  { method: 'PUT', path: '/api/url/:id', auth: 'user/admin', description: 'Update short URL' },
  { method: 'DELETE', path: '/api/url/:id', auth: 'user/admin', description: 'Delete short URL' },
  { method: 'GET', path: '/api/all', auth: 'admin(signature)', description: 'List all users and URLs' },
  { method: 'GET', path: '/api/users', auth: 'admin(signature)', description: 'List all users' },
  { method: 'GET', path: '/api/docs', auth: 'user', description: 'Role-based API docs' },
  { method: 'GET', path: '/api/public/theme', auth: 'public', description: 'Get global UI theme' },
  { method: 'GET', path: '/api/public/site-config', auth: 'public', description: 'Get global site config' },
  { method: 'GET', path: '/api/public/stats', auth: 'public', description: 'Get public counters and redirect speed' },
  { method: 'GET', path: '/api/admin/system', auth: 'admin(signature)', description: 'System/API status + metrics' },
  { method: 'GET', path: '/api/admin/theme', auth: 'admin(signature)', description: 'Get global UI theme (admin)' },
  { method: 'PUT', path: '/api/admin/theme', auth: 'admin(signature)', description: 'Update global UI theme' },
  { method: 'GET', path: '/api/admin/site-config', auth: 'admin(signature)', description: 'Get global site config' },
  { method: 'PUT', path: '/api/admin/site-config', auth: 'admin(signature)', description: 'Update global site config' },
  { method: 'GET', path: '/api/admin/giri', auth: 'admin(signature)', description: 'Read maintenance status' },
  { method: 'POST', path: '/api/admin/giri/unlock', auth: 'admin(signature)', description: 'Verify admin /admin/giri password' },
  { method: 'PUT', path: '/api/admin/giri', auth: 'admin(signature)', description: 'Toggle maintenance mode' },
  { method: 'GET', path: '/api/admin/docs', auth: 'admin(signature)', description: 'Swagger-like API catalog' },
  { method: 'GET', path: '/api/admin/cors', auth: 'admin(signature)', description: 'List allowed CORS origins' },
  { method: 'POST', path: '/api/admin/cors', auth: 'admin(signature)', description: 'Add allowed CORS origin' },
  { method: 'DELETE', path: '/api/admin/cors', auth: 'admin(signature)', description: 'Remove allowed CORS origin' },
  { method: 'GET', path: '/api/admin/rbac', auth: 'admin(signature)', description: 'Read RBAC policies' },
  { method: 'PUT', path: '/api/admin/rbac/global', auth: 'admin(signature)', description: 'Set global route access' },
  { method: 'PUT', path: '/api/admin/rbac/guest', auth: 'admin(signature)', description: 'Set guest route access' },
  { method: 'PUT', path: '/api/admin/rbac/user/:id', auth: 'admin(signature)', description: 'Set per-user route access' },
  { method: 'GET', path: '/api/admin/rate-limits', auth: 'admin(signature)', description: 'Read URL rate-limit policies' },
  { method: 'PUT', path: '/api/admin/rate-limits/guest', auth: 'admin(signature)', description: 'Set guest URL rate-limit' },
  { method: 'PUT', path: '/api/admin/rate-limits/user/:id', auth: 'admin(signature)', description: 'Set per-user URL rate-limit' },
  { method: 'GET', path: '/:code', auth: 'public', description: '301 redirect by short code' },
];

const SAMPLE_MAP = {
  'POST /api/url': {
    request_body: { long_url: 'https://example.com/abc', custom_alias: 'myalias1' },
    response_body: { code: 'myalias1', url: 'https://linkvio.vercel.app/myalias1' },
  },
  'GET /api/myurls': {
    request_body: null,
    response_body: [{ id: 1, short_code: 'ab12Cd', long_url: 'https://example.com', click_count: 42 }],
  },
  'POST /api/auth/request-otp': {
    request_body: { email: 'user@example.com' },
    response_body: { message: 'OTP sent', ttl_seconds: 300 },
  },
  'POST /api/auth/verify-otp': {
    request_body: { email: 'user@example.com', otp: '123456' },
    response_body: { access_token: '<jwt>', user: { id: 2, email: 'user@example.com', role: 'user' } },
  },
  'POST /api/me/apikey/regenerate': {
    request_body: null,
    response_body: { access_token: '<jwt>', user: { api_key: '<new_api_key>' } },
  },
};

export function buildDocsForRole(role) {
  const normalized = String(role || '').toLowerCase();
  let endpoints = API_CATALOG;

  if (normalized !== 'gadmin' && normalized !== 'admin') {
    endpoints = API_CATALOG.filter((api) => !String(api.auth).includes('admin'));
  }

  if (normalized === 'gadmin' || normalized === 'admin') {
    return endpoints.map((api) => {
      const key = `${api.method} ${api.path}`;
      return {
        ...api,
        sample: SAMPLE_MAP[key] || null,
      };
    });
  }

  return endpoints;
}

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
