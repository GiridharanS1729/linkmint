import crypto from 'node:crypto';

export function createAdminSignature(timestamp, path, privateKey) {
  return crypto
    .createHmac('sha256', privateKey)
    .update(`${timestamp}${path}`)
    .digest('hex');
}

export function verifyAdminSignature({ timestamp, path, signature, privateKey }) {
  if (!timestamp || !signature || !privateKey) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return false;

  const ageMs = Math.abs(Date.now() - tsNum);
  if (ageMs > 60_000) return false;

  const expected = createAdminSignature(String(timestamp), path, privateKey);

  const sigBuf = Buffer.from(String(signature));
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
