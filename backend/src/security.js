import crypto from 'node:crypto';

export function generateApiKey() {
  return crypto.randomBytes(24).toString('hex');
}
