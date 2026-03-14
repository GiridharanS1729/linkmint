import dotenv from 'dotenv';

dotenv.config();

function env(name, fallback = '') {
  const value = process.env[name];
  if (value == null) return fallback;
  return String(value).trim();
}

function defaultCookieSameSite(cookieSecure) {
  return cookieSecure ? 'none' : 'lax';
}

function normalizeSameSite(value, fallback) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'strict' || raw === 'lax' || raw === 'none') {
    return raw;
  }
  return fallback;
}

const cookieSecure = env('COOKIE_SECURE', env('NODE_ENV', 'development') === 'production' ? 'true' : 'false') === 'true';
const cookieSameSite = normalizeSameSite(env('COOKIE_SAME_SITE', defaultCookieSameSite(cookieSecure)), defaultCookieSameSite(cookieSecure));

export const config = {
  port: Number(env('PORT', 3000)),
  host: env('HOST', '0.0.0.0'),
  jwtSecret: env('JWT_SECRET', 'change-this-secret'),
  accessTokenExpiresIn: env('ACCESS_TOKEN_EXPIRES_IN', '10m'),
  refreshTokenExpiresIn: env('REFRESH_TOKEN_EXPIRES_IN', '7d'),
  frontendOrigin: env('FRONTEND_ORIGIN', 'http://localhost:5173'),
  redisUrl: env('REDIS_URL', 'redis://localhost:6379'),
  cookieSecure,
  cookieSameSite,
  adminPrivateKey: env('ADMIN_PRIVATE_KEY', 'change-admin-signature-key'),
  googleClientId: env('GOOGLE_CLIENT_ID', '').replace(/\s+/g, ''),
  smtpHost: env('SMTP_HOST', ''),
  smtpPort: Number(env('SMTP_PORT', 587)),
  smtpUser: env('SMTP_USER', ''),
  smtpPass: env('SMTP_PASS', ''),
  smtpFrom: env('SMTP_FROM', 'noreply@linkmint.local'),
};
