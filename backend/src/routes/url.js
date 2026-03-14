import geoip from 'geoip-lite';
import { z } from 'zod';
import { buildAliasSuggestions, generateUniqueCode, isValidAlias } from '../shortcode.js';
import { getRequestIp } from '../network.js';
import { consumeUrlRate, getGuestUrlLimit, getUserUrlLimit } from '../rateLimitPolicy.js';

const createUrlSchema = z.object({
  long_url: z.string().url(),
  custom_alias: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  expires_in_minutes: z.number().int().positive().max(525600).optional(),
});

const updateUrlSchema = z.object({
  long_url: z.string().url().optional(),
  custom_alias: z.string().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  expires_in_minutes: z.number().int().positive().max(525600).optional(),
});

async function createShortUrl(fastify, payload, request) {
  const { long_url: longUrl, custom_alias: customAlias } = payload;
  let expiresAt = null;
  if (payload.expires_at) {
    expiresAt = new Date(payload.expires_at);
  } else if (payload.expires_in_minutes) {
    expiresAt = new Date(Date.now() + payload.expires_in_minutes * 60 * 1000);
  }

  let shortCode;
  if (customAlias) {
    if (!isValidAlias(customAlias)) {
      return {
        error: {
          status: 400,
          body: { message: 'Invalid alias. Allowed characters: [a-zA-Z0-9]' },
        },
      };
    }

    const exists = await fastify.prisma.url.findUnique({ where: { shortCode: customAlias } });
    if (exists) {
      return {
        error: {
          status: 409,
          body: {
            message: 'Alias already exists',
            suggestions: buildAliasSuggestions(customAlias),
          },
        },
      };
    }
    shortCode = customAlias;
  } else {
    shortCode = await generateUniqueCode(fastify.prisma, 6);
  }

  const origin = request.headers.origin;
  const createdFrom = origin ? 'site' : 'api';
  const createdIp = getRequestIp(request);

  const url = await fastify.prisma.url.create({
    data: {
      shortCode,
      longUrl,
      expiresAt,
      createdBy: request.dbUser?.id || null,
      createdFrom,
      createdIp,
    },
  });

  try {
    await fastify.redis.set(shortCode, longUrl);
  } catch (error) {
    request.log.warn({ error }, 'Redis cache set failed during URL creation');
  }

  return {
    url,
  };
}

export default async function urlRoutes(fastify) {
  async function enforceCreateUrlRateLimit(request, reply) {
    const role = request.dbUser?.role || request.user?.role || 'guest';
    if (role === 'GAdmin') return;

    try {
      if (request.dbUser?.id) {
        const userId = request.dbUser.id;
        const limit = await getUserUrlLimit(fastify.redis, userId);
        const key = `ratelimit:url:user:${userId}`;
        const result = await consumeUrlRate(fastify.redis, key, limit);
        if (!result.allowed) {
          return reply.code(429).send({ message: 'Rate limit exceeded for this user', limit_per_minute: limit });
        }
        return;
      }

      const limit = await getGuestUrlLimit(fastify.redis);
      const key = `ratelimit:url:guest:${request.ip}`;
      const result = await consumeUrlRate(fastify.redis, key, limit);
      if (!result.allowed) {
        return reply.code(429).send({ message: 'Rate limit exceeded for guest requests', limit_per_minute: limit });
      }
    } catch (error) {
      request.log.warn({ error }, 'Dynamic URL rate-limit check failed; allowing request');
    }
  }

  fastify.post(
    '/api/url',
    {
      preHandler: [fastify.validateOrigin, fastify.optionalAuth, enforceCreateUrlRateLimit],
    },
    async (request, reply) => {
      const parsed = createUrlSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
      }

      const result = await createShortUrl(fastify, parsed.data, request);
      if (result.error) {
        return reply.code(result.error.status).send(result.error.body);
      }

      if (result.url.createdFrom === 'site') {
        const host = request.headers.host || '';
        const proto = request.protocol || 'https';
        const shortUrl = host ? `${proto}://${host}/${result.url.shortCode}` : result.url.shortCode;
        return reply.code(201).send({
          code: result.url.shortCode,
          url: shortUrl,
          expires_at: result.url.expiresAt,
        });
      }

      return reply.code(201).send({
        id: result.url.id,
        short_code: result.url.shortCode,
        long_url: result.url.longUrl,
        expires_at: result.url.expiresAt,
        created_from: result.url.createdFrom,
        created_ip: result.url.createdIp,
        created_at: result.url.createdAt,
      });
    },
  );

  fastify.get('/api/myurls', { preHandler: [fastify.requireAuth] }, async (request) => {
    const urls = await fastify.prisma.url.findMany({
      where: { createdBy: request.dbUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { clicks: true } },
      },
    });

    return urls.map((url) => ({
      id: url.id,
      short_code: url.shortCode,
      long_url: url.longUrl,
      expires_at: url.expiresAt,
      created_at: url.createdAt,
      click_count: url._count.clicks,
    }));
  });

  fastify.get('/api/url/:id/analytics', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const id = Number(request.params.id);
    const url = await fastify.prisma.url.findUnique({ where: { id } });
    if (!url) return reply.code(404).send({ message: 'URL not found' });

    const isOwner = url.createdBy === request.dbUser.id;
    const isAdmin = request.dbUser.role === 'GAdmin' || request.dbUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      return reply.code(403).send({ message: 'Not allowed' });
    }

    const clicks = await fastify.prisma.click.findMany({ where: { urlId: id }, orderBy: { clickedAt: 'desc' }, take: 100 });
    return { url_id: id, clicks };
  });

  fastify.put('/api/url/:id', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const id = Number(request.params.id);
    const parsed = updateUrlSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    const existing = await fastify.prisma.url.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'URL not found' });
    if (existing.createdBy !== request.dbUser.id && request.dbUser.role !== 'GAdmin') {
      return reply.code(403).send({ message: 'Not allowed' });
    }

    const data = {};
    if (parsed.data.long_url) data.longUrl = parsed.data.long_url;
    if (Object.prototype.hasOwnProperty.call(parsed.data, 'expires_at')) {
      data.expiresAt = parsed.data.expires_at ? new Date(parsed.data.expires_at) : null;
    } else if (parsed.data.expires_in_minutes) {
      data.expiresAt = new Date(Date.now() + parsed.data.expires_in_minutes * 60 * 1000);
    }

    if (parsed.data.custom_alias) {
      if (!isValidAlias(parsed.data.custom_alias)) {
        return reply.code(400).send({ message: 'Invalid alias. Allowed characters: [a-zA-Z0-9]' });
      }
      const codeTaken = await fastify.prisma.url.findUnique({ where: { shortCode: parsed.data.custom_alias } });
      if (codeTaken && codeTaken.id !== id) {
        return reply.code(409).send({
          message: 'Alias already exists',
          suggestions: buildAliasSuggestions(parsed.data.custom_alias),
        });
      }
      data.shortCode = parsed.data.custom_alias;
    }

    const updated = await fastify.prisma.url.update({ where: { id }, data });
    try {
      await fastify.redis.set(updated.shortCode, updated.longUrl);
    } catch (error) {
      request.log.warn({ error }, 'Redis cache set failed during URL update');
    }
    if (existing.shortCode !== updated.shortCode) {
      try {
        await fastify.redis.del(existing.shortCode);
      } catch (error) {
        request.log.warn({ error }, 'Redis cache delete failed during code rename');
      }
    }

    return {
      id: updated.id,
      short_code: updated.shortCode,
      long_url: updated.longUrl,
      expires_at: updated.expiresAt,
      created_at: updated.createdAt,
    };
  });

  fastify.delete('/api/url/:id', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const id = Number(request.params.id);
    const existing = await fastify.prisma.url.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ message: 'URL not found' });

    const isOwner = existing.createdBy === request.dbUser.id;
    const isAdmin = request.dbUser.role === 'GAdmin' || request.dbUser.role === 'admin';
    if (!isOwner && !isAdmin) {
      return reply.code(403).send({ message: 'Not allowed' });
    }

    await fastify.prisma.url.delete({ where: { id } });
    try {
      await fastify.redis.del(existing.shortCode);
    } catch (error) {
      request.log.warn({ error }, 'Redis cache delete failed during URL delete');
    }
    return reply.code(204).send();
  });

  fastify.get('/:code', async (request, reply) => {
    const code = request.params.code;

    let longUrl = null;
    try {
      longUrl = await fastify.redis.get(code);
    } catch (error) {
      request.log.warn({ error }, 'Redis cache get failed during redirect');
    }
    let urlRecord = null;

    if (!longUrl) {
      urlRecord = await fastify.prisma.url.findUnique({ where: { shortCode: code } });
      if (!urlRecord) return reply.code(404).send({ message: 'Short URL not found' });
      if (urlRecord.expiresAt && urlRecord.expiresAt <= new Date()) {
        return reply.code(410).send({ message: 'Short URL expired' });
      }

      longUrl = urlRecord.longUrl;
      try {
        await fastify.redis.set(code, longUrl);
      } catch (error) {
        request.log.warn({ error }, 'Redis cache set failed during redirect');
      }
    } else {
      urlRecord = await fastify.prisma.url.findUnique({
        where: { shortCode: code },
        select: { id: true, expiresAt: true },
      });
      if (urlRecord?.expiresAt && urlRecord.expiresAt <= new Date()) {
        try {
          await fastify.redis.del(code);
        } catch (error) {
          request.log.warn({ error }, 'Redis cache delete failed during expired redirect');
        }
        return reply.code(410).send({ message: 'Short URL expired' });
      }
    }

    if (urlRecord?.id) {
      const ip = getRequestIp(request);
      const geo = geoip.lookup(ip);
      const country = geo?.country || 'Unknown';
      const referrer = request.headers.referer || request.headers.referrer || null;

      fastify.prisma.click.create({
        data: {
          urlId: urlRecord.id,
          ip,
          country,
          referrer: referrer ? String(referrer) : null,
        },
      }).catch((error) => {
        request.log.error({ error }, 'Failed to record click');
      });
    }

    return reply.redirect(longUrl, 301);
  });
}
