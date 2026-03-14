import { z } from 'zod';
import {
  getGlobalPolicies,
  getGuestPolicies,
  getUserPolicies,
  RBAC_ROUTES,
  setGlobalAccess,
  setGuestAccess,
  setUserAccess,
} from '../rbac.js';
import { API_CATALOG, collectHealth } from '../systemStatus.js';

const setPolicySchema = z.object({
  route_key: z.string().min(3),
  allowed: z.boolean(),
});

export default async function adminRoutes(fastify) {
  fastify.get('/api/all', { preHandler: [fastify.requireAdmin] }, async () => {
    const [users, urls] = await Promise.all([
      fastify.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, apiKey: true, createdAt: true },
      }),
      fastify.prisma.url.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, role: true } },
          _count: { select: { clicks: true } },
        },
      }),
    ]);

    return { users, urls };
  });

  fastify.get('/api/users', { preHandler: [fastify.requireAdmin] }, async () => {
    return fastify.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, apiKey: true, createdAt: true },
    });
  });

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

  fastify.get('/api/admin/docs', { preHandler: [fastify.requireAdmin] }, async () => ({
    service: 'linkvio-api',
    version: '1.0.0',
    endpoints: API_CATALOG,
    security: {
      user: ['Authorization: Bearer <access_token>', 'X-API-Key: <api_key>'],
      admin: ['X-Timestamp', 'X-Admin-Signature'],
      note: 'Admin signature = HMAC_SHA256(timestamp + request_path, ADMIN_PRIVATE_KEY)',
    },
  }));

  fastify.get('/api/admin/rbac', { preHandler: [fastify.requireAdmin] }, async (request, reply) => {
    const userId = request.query?.user_id ? Number(request.query.user_id) : null;
    if (request.query?.user_id && Number.isNaN(userId)) {
      return reply.code(400).send({ message: 'Invalid user_id query parameter' });
    }

    const [global, guest, userPolicies] = await Promise.all([
      getGlobalPolicies(fastify.redis),
      getGuestPolicies(fastify.redis),
      userId != null ? getUserPolicies(fastify.redis, userId) : Promise.resolve({}),
    ]);

    return {
      routes: RBAC_ROUTES,
      global,
      guest,
      user: userId != null ? { id: userId, policies: userPolicies } : null,
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
}
