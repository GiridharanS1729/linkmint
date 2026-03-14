export async function issueSession(fastify, reply, user) {
  const accessToken = await reply.jwtSign(
    { userId: user.id, role: user.role, type: 'access' },
    { expiresIn: fastify.config.accessTokenExpiresIn },
  );

  const refreshToken = await reply.jwtSign(
    { userId: user.id, role: user.role, type: 'refresh' },
    { expiresIn: fastify.config.refreshTokenExpiresIn },
  );

  reply.setCookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: fastify.config.cookieSecure,
    sameSite: fastify.config.cookieSameSite,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  try {
    await fastify.redis.set(`session:user:${user.id}`, '1', 'EX', 7 * 24 * 60 * 60);
  } catch {
    // Session tracking is best-effort and should never block auth.
  }

  return {
    access_token: accessToken,
    expires_in: fastify.config.accessTokenExpiresIn,
    user: {
      id: user.id,
      email: user.email,
      username: user.username || user.email.split('@')[0],
      role: user.role,
      api_key: user.apiKey,
    },
  };
}

export async function verifyRefreshToken(fastify, token) {
  const payload = await fastify.jwt.verify(token);
  if (payload.type !== 'refresh') {
    throw new Error('Invalid refresh token type');
  }
  return payload;
}

export function clearSessionCookie(fastify, reply) {
  reply.clearCookie('refresh_token', {
    httpOnly: true,
    secure: fastify.config.cookieSecure,
    sameSite: fastify.config.cookieSameSite,
    path: '/',
  });
}
