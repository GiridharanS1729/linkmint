import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { redis } from './redis.js';
import authPlugin from './auth.js';
import authRoutes from './routes/auth.js';
import urlRoutes from './routes/url.js';
import adminRoutes from './routes/admin.js';
import { collectHealth } from './systemStatus.js';

export async function createApp() {
  const app = Fastify({ logger: true });

  app.decorate('prisma', prisma);
  app.decorate('redis', redis);
  app.decorate('config', config);

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cookie);

  await app.register(cors, {
    origin: config.frontendOrigin.split(',').map((item) => item.trim()),
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.jwtSecret,
  });

  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(authPlugin);
  await app.register(authRoutes);
  await app.register(urlRoutes);
  await app.register(adminRoutes);

  app.get('/', async () => ({
    service: 'linkvio-api',
    status: 'ok',
    docs: '/api/admin/docs',
    health: '/health',
    time: new Date().toISOString(),
  }));

  app.get('/health', async () => collectHealth(app));

  return app;
}
