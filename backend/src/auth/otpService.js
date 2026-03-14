import crypto from 'node:crypto';

const OTP_TTL_SECONDS = 5 * 60;

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function saveOtp(redis, email, otp) {
  await redis.set(`otp:${email.toLowerCase()}`, otp, 'EX', OTP_TTL_SECONDS);
}

export async function verifyOtp(redis, email, otp) {
  const key = `otp:${email.toLowerCase()}`;
  const stored = await redis.get(key);
  if (!stored) return false;

  const valid = crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(String(otp)));
  if (valid) {
    await redis.del(key);
  }
  return valid;
}

export async function resendOtp(redis, email) {
  const otp = generateOtp();
  await saveOtp(redis, email, otp);
  return otp;
}

export const otpTtlSeconds = OTP_TTL_SECONDS;
