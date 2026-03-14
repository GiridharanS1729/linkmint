import crypto from 'node:crypto';

const OTP_TTL_SECONDS = 5 * 60;
const memoryOtp = new Map();

function nowMs() {
  return Date.now();
}

function setMemoryOtp(email, otp) {
  memoryOtp.set(email.toLowerCase(), {
    otp: String(otp),
    expiresAt: nowMs() + OTP_TTL_SECONDS * 1000,
  });
}

function getMemoryOtp(email) {
  const key = email.toLowerCase();
  const entry = memoryOtp.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    memoryOtp.delete(key);
    return null;
  }
  return entry.otp;
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function saveOtp(redis, email, otp) {
  const key = `otp:${email.toLowerCase()}`;
  try {
    await redis.set(key, otp, 'EX', OTP_TTL_SECONDS);
  } catch {
    setMemoryOtp(email, otp);
  }
}

export async function verifyOtp(redis, email, otp) {
  const key = `otp:${email.toLowerCase()}`;
  let stored = null;
  try {
    stored = await redis.get(key);
  } catch {
    stored = getMemoryOtp(email);
  }
  if (!stored) return false;

  const valid = crypto.timingSafeEqual(Buffer.from(stored), Buffer.from(String(otp)));
  if (valid) {
    try {
      await redis.del(key);
    } catch {
      memoryOtp.delete(email.toLowerCase());
    }
  }
  return valid;
}

export async function resendOtp(redis, email) {
  const otp = generateOtp();
  await saveOtp(redis, email, otp);
  return otp;
}

export const otpTtlSeconds = OTP_TTL_SECONDS;
