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
}
