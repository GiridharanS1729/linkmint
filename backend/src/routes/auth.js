import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { generateApiKey } from '../security.js';
import { createGoogleClient, verifyGoogleToken } from '../auth/googleAuth.js';
import { clearSessionCookie, issueSession, verifyRefreshToken } from '../auth/jwtService.js';
import { generateOtp, otpTtlSeconds, saveOtp, verifyOtp } from '../auth/otpService.js';

const emailSchema = z.string().email();
const otpRequestSchema = z.object({
  email: emailSchema,
});
const otpVerifySchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/),
  mode: z.enum(['login', 'signup']).optional(),
});
const googleSchema = z.object({
  id_token: z.string().min(10),
});
const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

function randomPasswordHash() {
  return bcrypt.hashSync(crypto.randomBytes(24).toString('hex'), 10);
}

function isAdminCredential(email, password) {
  return email.toLowerCase() === 'giridharans1729@gmail.com' && password === 'Giri@2005';
}

function createMailer(config) {
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

async function sendOtpEmail(fastify, email, otp) {
  const transporter = createMailer(fastify.config);
  const info = await transporter.sendMail({
    from: fastify.config.smtpFrom,
    to: email,
    subject: 'Your Linkvio OTP Code',
    text: `Your OTP is ${otp}. It expires in ${Math.floor(otpTtlSeconds / 60)} minutes.`,
    html: `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in ${Math.floor(otpTtlSeconds / 60)} minutes.</p>`,
  });

  // In dev fallback mode, this logs the OTP payload for local testing.
  fastify.log.info({ otpEmail: info.messageId || info.message }, 'OTP email dispatched');
}

async function getOrCreateUser(fastify, email, role = 'user') {
  const normalized = email.toLowerCase();
  let user = await fastify.prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    user = await fastify.prisma.user.create({
      data: {
        email: normalized,
        passwordHash: randomPasswordHash(),
        apiKey: generateApiKey(),
        role,
      },
    });
  }

  return user;
}

export default async function authRoutes(fastify) {
  const googleClient = createGoogleClient(fastify.config.googleClientId);

  fastify.post('/api/auth/request-otp', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = otpRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();
    const otp = generateOtp();
    await saveOtp(fastify.redis, email, otp);
    await sendOtpEmail(fastify, email, otp);

    return reply.send({ message: 'OTP sent', ttl_seconds: otpTtlSeconds });
  });

  fastify.post('/api/auth/verify-otp', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = otpVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    const { email, otp } = parsed.data;
    const valid = await verifyOtp(fastify.redis, email, otp);
    if (!valid) {
      return reply.code(401).send({ message: 'Invalid or expired OTP' });
    }

    const role = email.toLowerCase() === 'giridharans1729@gmail.com' ? 'GAdmin' : 'user';
    const user = await getOrCreateUser(fastify, email, role);

    const session = await issueSession(fastify, reply, user);
    return reply.send(session);
  });

  fastify.post('/api/auth/google', async (request, reply) => {
    const parsed = googleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    if (!fastify.config.googleClientId) {
      return reply.code(500).send({ message: 'Google OAuth is not configured' });
    }

    let googlePayload;
    try {
      googlePayload = await verifyGoogleToken(googleClient, parsed.data.id_token, fastify.config.googleClientId);
    } catch {
      return reply.code(401).send({ message: 'Invalid Google token' });
    }

    const role = googlePayload.email === 'giridharans1729@gmail.com' ? 'GAdmin' : 'user';
    const user = await getOrCreateUser(fastify, googlePayload.email, role);
    const session = await issueSession(fastify, reply, user);
    return reply.send(session);
  });

  fastify.post('/api/login', async (request, reply) => {
    const parsed = adminLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const normalized = email.toLowerCase();

    let user = await fastify.prisma.user.findUnique({ where: { email: normalized } });

    if (isAdminCredential(normalized, password)) {
      if (!user) {
        user = await fastify.prisma.user.create({
          data: {
            email: normalized,
            passwordHash: await bcrypt.hash(password, 10),
            role: 'GAdmin',
            apiKey: generateApiKey(),
          },
        });
      } else if (user.role !== 'GAdmin') {
        user = await fastify.prisma.user.update({ where: { id: user.id }, data: { role: 'GAdmin' } });
      }

      const session = await issueSession(fastify, reply, user);
      return reply.send(session);
    }

    if (!user) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ message: 'Invalid credentials' });
    }

    const session = await issueSession(fastify, reply, user);
    return reply.send(session);
  });

  fastify.post('/api/signup', async (request, reply) => {
    const parsed = adminLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid request body', issues: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const normalized = email.toLowerCase();
    const existing = await fastify.prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return reply.code(409).send({ message: 'Email already in use' });
    }

    const role = normalized === 'giridharans1729@gmail.com' && password === 'Giri@2005' ? 'GAdmin' : 'user';
    const user = await fastify.prisma.user.create({
      data: {
        email: normalized,
        passwordHash: await bcrypt.hash(password, 10),
        apiKey: generateApiKey(),
        role,
      },
    });

    const session = await issueSession(fastify, reply, user);
    return reply.code(201).send(session);
  });

  fastify.post('/api/refresh', async (request, reply) => {
    const refreshToken = request.cookies.refresh_token;
    if (!refreshToken) {
      return reply.code(401).send({ message: 'Missing refresh token' });
    }

    let payload;
    try {
      payload = await verifyRefreshToken(fastify, refreshToken);
    } catch {
      clearSessionCookie(fastify, reply);
      return reply.code(401).send({ message: 'Invalid refresh token' });
    }

    const user = await fastify.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      clearSessionCookie(fastify, reply);
      return reply.code(401).send({ message: 'Invalid refresh token user' });
    }

    const session = await issueSession(fastify, reply, user);
    return reply.send(session);
  });

  fastify.post('/api/me/apikey/regenerate', { preHandler: [fastify.requireAuth] }, async (request, reply) => {
    const nextApiKey = generateApiKey();
    const user = await fastify.prisma.user.update({
      where: { id: request.dbUser.id },
      data: { apiKey: nextApiKey },
    });

    const session = await issueSession(fastify, reply, user);
    return reply.send(session);
  });

  fastify.post('/api/logout', { preHandler: [fastify.optionalAuth] }, async (request, reply) => {
    if (request.dbUser?.id) {
      try {
        await fastify.redis.del(`session:user:${request.dbUser.id}`);
      } catch {
        // ignore session metric cleanup errors
      }
    }
    clearSessionCookie(fastify, reply);
    return reply.send({ message: 'Logged out' });
  });
}
