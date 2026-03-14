import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './prisma.js';
import { redis } from './redis.js';

const app = await createApp();

const closeSignals = ['SIGINT', 'SIGTERM'];
closeSignals.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
});

try {
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Backend running on http://${config.host}:${config.port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
