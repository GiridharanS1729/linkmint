import fp from 'fastify-plugin';
import { verifyAdminSignature } from './auth/adminSignature.js';
import { getRouteKey, isRouteAllowed } from './rbac.js';

function parseBearerToken(authHeader) {
  if (!authHeader) return null;
  const [scheme, token] = String(authHeader).split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

export default fp(async function authPlugin(fastify) {
  fastify.decorate('enforceRbac', async function enforceRbac(request, reply, userId = null, role = 'guest') {
    if (role === 'GAdmin') return;
    const routeKey = getRouteKey(request);
    const allowed = await isRouteAllowed(fastify.redis, userId, routeKey);
    if (!allowed) {
      return reply.code(403).send({ message: 'Route access disabled by admin policy', route: routeKey });
    }
  });

  fastify.decorate('requireAuth', async function requireAuth(request, reply) {
    const token = parseBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send({ message: 'Missing Authorization Bearer token' });
    }

    let payload;
    try {
      payload = await request.jwtVerify();
    } catch {
      return reply.code(401).send({ message: 'Invalid or expired JWT' });
    }

    if (payload.type !== 'access') {
      return reply.code(401).send({ message: 'Invalid access token type' });
    }

    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      return reply.code(401).send({ message: 'Missing X-API-Key' });
    }

    const dbUser = await fastify.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!dbUser || dbUser.apiKey !== apiKey) {
      return reply.code(401).send({ message: 'Invalid API key' });
    }

    request.user = payload;
    request.dbUser = dbUser;
    await fastify.enforceRbac(request, reply, dbUser.id, dbUser.role);
  });

  fastify.decorate('optionalAuth', async function optionalAuth(request, reply) {
    const hasAuth = Boolean(request.headers.authorization) || Boolean(request.headers['x-api-key']);
    if (!hasAuth) {
      request.user = { role: 'guest' };
      request.dbUser = null;
      await fastify.enforceRbac(request, reply, null, 'guest');
      return;
    }

    await fastify.requireAuth(request, reply);
  });

  fastify.decorate('validateOrigin', async function validateOrigin(request, reply) {
    const origin = request.headers.origin;
    if (!origin) return;

    const allowed = String(fastify.config.frontendOrigin || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (allowed.length > 0 && !allowed.includes(origin)) {
      return reply.code(403).send({ message: 'Origin not allowed' });
    }
  });

  fastify.decorate('verifyAdminSignature', async function verifyAdminSignatureHeader(request, reply) {
    const timestamp = request.headers['x-timestamp'];
    const signature = request.headers['x-admin-signature'];
    const path = request.url.split('?')[0];

    const valid = verifyAdminSignature({
      timestamp,
      signature,
      path,
      privateKey: fastify.config.adminPrivateKey,
    });

    if (!valid) {
      return reply.code(401).send({ message: 'Invalid admin signature' });
    }
  });

  fastify.decorate('requireAdmin', async function requireAdmin(request, reply) {
    await fastify.requireAuth(request, reply);
    if (reply.sent) return;

    const isGAdmin = request.dbUser.role === 'GAdmin';
    if (!isGAdmin) {
      return reply.code(403).send({ message: 'Admin access required' });
    }

    const signatureRequired = request.method !== 'GET';
    if (signatureRequired) {
      await fastify.verifyAdminSignature(request, reply);
    }
  });
});
