import geoip from 'geoip-lite';
import { z } from 'zod';
import { buildAliasSuggestions, generateUniqueCode, isValidAlias } from '../shortcode.js';
import { getRequestIp } from '../network.js';

const createUrlSchema = z.object({
  long_url: z.string().url(),
  custom_alias: z.string().optional(),
});

const updateUrlSchema = z.object({
  long_url: z.string().url().optional(),
  custom_alias: z.string().optional(),
});

async function createShortUrl(fastify, payload, request) {
  const { long_url: longUrl, custom_alias: customAlias } = payload;

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
  fastify.post(
    '/api/url',
    {
      preHandler: [fastify.validateOrigin, fastify.optionalAuth],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          keyGenerator: (request) => {
            const apiKey = request.headers['x-api-key'];
            if (apiKey) return `user:${apiKey}`;
            return `ip:${request.ip}`;
          },
        },
      },
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

      return reply.code(201).send({
        id: result.url.id,
        short_code: result.url.shortCode,
        long_url: result.url.longUrl,
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

      longUrl = urlRecord.longUrl;
      try {
        await fastify.redis.set(code, longUrl);
      } catch (error) {
        request.log.warn({ error }, 'Redis cache set failed during redirect');
      }
    } else {
      urlRecord = await fastify.prisma.url.findUnique({ where: { shortCode: code }, select: { id: true } });
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
