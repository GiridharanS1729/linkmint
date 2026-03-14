import { z } from 'zod';
import {
  getGlobalPolicies,
  getGuestPolicies,
  isRouteAllowed,
  getUserPolicies,
  RBAC_ROUTES,
  setGlobalAccess,
  setGuestAccess,
  setUserAccess,
} from '../rbac.js';
import { collectHealth, buildDocsForRole } from '../systemStatus.js';
import {
  DEFAULT_URL_LIMIT_PER_MINUTE,
  getAllUserUrlLimits,
  getGuestUrlLimit,
  setGuestUrlLimit,
  setUserUrlLimit,
} from '../rateLimitPolicy.js';
import { addCustomOrigin, removeCustomOrigin } from '../originPolicy.js';
import { getTheme, setTheme } from '../themePolicy.js';
import { getSiteConfig, setSiteConfig, sanitizeSiteConfig } from '../siteConfigPolicy.js';

const setPolicySchema = z.object({
  route_key: z.string().min(3),
  allowed: z.boolean(),
});
const setRateLimitSchema = z.object({
  max_per_minute: z.number().int().min(0).max(1_000_000),
});
const setThemeSchema = z.object({
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
const setSiteConfigSchema = z.object({
  site_name: z.string().min(1).max(40),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

function isMissingExpiresAtColumn(error) {
  if (!error) return false;
  const msg = String(error.message || '');
  return String(error.code || '') === 'P2022' && msg.includes('expires_at');
}

export default async function adminRoutes(fastify) {
  fastify.get('/api/all', { preHandler: [fastify.requireAdmin] }, async () => {
    const usersPromise = fastify.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, apiKey: true, createdAt: true },
    });

    let urls;
    try {
      urls = await fastify.prisma.url.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shortCode: true,
          longUrl: true,
          expiresAt: true,
          createdAt: true,
          user: { select: { id: true, email: true, role: true } },
          _count: { select: { clicks: true } },
        },
      });
    } catch (error) {
      if (!isMissingExpiresAtColumn(error)) throw error;
      urls = await fastify.prisma.url.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          shortCode: true,
          longUrl: true,
          createdAt: true,
          user: { select: { id: true, email: true, role: true } },
          _count: { select: { clicks: true } },
        },
      });
    }

    const users = await usersPromise;
    return { users, urls };
  });

  fastify.get('/api/users', { preHandler: [fastify.requireAdmin] }, async () => {
    return fastify.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, apiKey: true, createdAt: true },
    });
  });

  fastify.get('/api/docs', { preHandler: [fastify.requireAuth] }, async (request) => {
    const role = request.dbUser?.role || 'user';
    let endpoints = buildDocsForRole(role);

    if (role !== 'GAdmin') {
      try {
        const checks = await Promise.all(endpoints.map(async (ep) => {
          const allowed = await isRouteAllowed(fastify.redis, request.dbUser.id, `${ep.method}:${ep.path}`);
          return allowed ? ep : null;
        }));
        endpoints = checks.filter(Boolean);
      } catch {
        // On Redis issues, return role-based docs without RBAC filtering.
      }
    }

    return {
      service: 'linkvio-api',
      version: '1.0.0',
      role,
      endpoints,
    };
  });

  fastify.get('/api/public/theme', async () => {
    return getTheme(fastify.redis);
  });

  fastify.get('/api/public/site-config', async () => {
    return getSiteConfig(fastify.redis);
  });

  fastify.get('/api/admin/docs', { preHandler: [fastify.requireAdmin] }, async () => ({
    service: 'linkvio-api',
    version: '1.0.0',
    role: 'GAdmin',
    endpoints: buildDocsForRole('GAdmin'),
    security: {
      user: ['Authorization: Bearer <access_token>', 'X-API-Key: <api_key>'],
      admin: ['X-Timestamp', 'X-Admin-Signature'],
      note: 'Admin signature = HMAC_SHA256(timestamp + request_path, ADMIN_PRIVATE_KEY)',
    },
  }));

  fastify.get('/api/admin/system', { preHandler: [fastify.requireAdmin] }, async () => {
    const [health, userStats, urlStats, clickStats, roleGroups] = await Promise.all([
      collectHealth(fastify),
      fastify.prisma.user.count(),
      fastify.prisma.url.count(),
      fastify.prisma.click.count(),
      fastify.prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    ]);

    let activeSessionCount = 0;
    try {
      const keys = await fastify.redis.keys('session:user:*');
      activeSessionCount = keys.length;
    } catch {
      activeSessionCount = 0;
    }

    return {
      health,
      metrics: {
        users_total: userStats,
        urls_total: urlStats,
        clicks_total: clickStats,
        logged_in_users_estimate: activeSessionCount,
        not_logged_in_users_estimate: Math.max(userStats - activeSessionCount, 0),
        role_distribution: roleGroups.map((r) => ({ role: r.role, count: r._count.role })),
      },
    };
  });

  fastify.get('/api/admin/theme', { preHandler: [fastify.requireAdmin] }, async () => getTheme(fastify.redis));

  fastify.put('/api/admin/theme', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const parsed = setThemeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid theme payload', issues: parsed.error.flatten() });
    }
    const theme = await setTheme(fastify.redis, parsed.data);
    return { message: 'Theme updated', theme };
  });

  fastify.get('/api/admin/site-config', { preHandler: [fastify.requireAdmin] }, async () => {
    return getSiteConfig(fastify.redis);
  });

  fastify.put('/api/admin/site-config', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const parsed = setSiteConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid site config payload', issues: parsed.error.flatten() });
    }
    const config = await setSiteConfig(fastify.redis, sanitizeSiteConfig(parsed.data));
    return { message: 'Site config updated', config };
  });

  fastify.get('/api/admin/cors', { preHandler: [fastify.requireAdmin] }, async () => {
    const allowed_origins = await fastify.getAllowedOrigins();
    return { allowed_origins };
  });

  fastify.post('/api/admin/cors', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const origin = request.body?.origin;
    if (!origin || typeof origin !== 'string') {
      return reply.code(400).send({ message: 'origin is required' });
    }
    try {
      const result = await addCustomOrigin(fastify.redis, origin);
      if (!result.ok) return reply.code(503).send({ message: 'Redis unavailable. Try again.' });
      return { message: 'Origin added', origin: result.origin };
    } catch (error) {
      return reply.code(400).send({ message: error.message || 'Invalid origin' });
    }
  });

  fastify.delete('/api/admin/cors', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const origin = request.body?.origin;
    if (!origin || typeof origin !== 'string') {
      return reply.code(400).send({ message: 'origin is required' });
    }
    try {
      const result = await removeCustomOrigin(fastify.redis, origin);
      if (!result.ok) return reply.code(503).send({ message: 'Redis unavailable. Try again.' });
      return { message: 'Origin removed', origin: result.origin };
    } catch (error) {
      return reply.code(400).send({ message: error.message || 'Invalid origin' });
    }
  });

  fastify.get('/api/admin/rbac', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const userId = request.query?.user_id ? Number(request.query.user_id) : null;
    if (request.query?.user_id && Number.isNaN(userId)) {
      return reply.code(400).send({ message: 'Invalid user_id query parameter' });
    }

    let global = {};
    let guest = {};
    let userPolicies = {};
    let warning = null;
    try {
      [global, guest, userPolicies] = await Promise.all([
        getGlobalPolicies(fastify.redis),
        getGuestPolicies(fastify.redis),
        userId != null ? getUserPolicies(fastify.redis, userId) : Promise.resolve({}),
      ]);
    } catch {
      warning = 'Redis unavailable. Showing default-empty RBAC data.';
    }

    return {
      routes: RBAC_ROUTES,
      global,
      guest,
      user: userId != null ? { id: userId, policies: userPolicies } : null,
      warning,
    };
  });

  fastify.put('/api/admin/rbac/global', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const parsed = setPolicySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }
    await setGlobalAccess(fastify.redis, parsed.data.route_key, parsed.data.allowed);
    return { message: 'Global route policy updated', ...parsed.data };
  });

  fastify.put('/api/admin/rbac/guest', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const parsed = setPolicySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }
    await setGuestAccess(fastify.redis, parsed.data.route_key, parsed.data.allowed);
    return { message: 'Guest route policy updated', ...parsed.data };
  });

  fastify.put('/api/admin/rbac/user/:id', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const parsed = setPolicySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    const userId = Number(request.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return reply.code(400).send({ message: 'Invalid user id' });
    }

    const user = await fastify.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.code(404).send({ message: 'User not found' });

    await setUserAccess(fastify.redis, userId, parsed.data.route_key, parsed.data.allowed);
    return { message: 'User route policy updated', user_id: userId, ...parsed.data };
  });

  fastify.get('/api/admin/rate-limits', { preHandler: [fastify.requireAdmin] }, async () => {
    let guest = DEFAULT_URL_LIMIT_PER_MINUTE;
    let userLimits = {};
    let warning = null;
    try {
      [guest, userLimits] = await Promise.all([
        getGuestUrlLimit(fastify.redis),
        getAllUserUrlLimits(fastify.redis),
      ]);
    } catch {
      warning = 'Redis unavailable. Showing default rate limits.';
    }

    return {
      defaults: {
        user_per_minute: DEFAULT_URL_LIMIT_PER_MINUTE,
        guest_per_minute: DEFAULT_URL_LIMIT_PER_MINUTE,
      },
      guest_per_minute: guest,
      user_limits: userLimits,
      note: 'GAdmin users are unlimited for /api/url',
      warning,
    };
  });

  fastify.put('/api/admin/rate-limits/guest', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const parsed = setRateLimitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }
    await setGuestUrlLimit(fastify.redis, parsed.data.max_per_minute);
    return { message: 'Guest rate limit updated', max_per_minute: parsed.data.max_per_minute };
  });

  fastify.put('/api/admin/rate-limits/user/:id', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const parsed = setRateLimitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    const userId = Number(request.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return reply.code(400).send({ message: 'Invalid user id' });
    }

    const user = await fastify.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.code(404).send({ message: 'User not found' });

    await setUserUrlLimit(fastify.redis, userId, parsed.data.max_per_minute);
    return { message: 'User rate limit updated', user_id: userId, max_per_minute: parsed.data.max_per_minute };
  });
}
