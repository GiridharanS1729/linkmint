const BASE62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function randomBase62(length = 6) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += BASE62.charAt(Math.floor(Math.random() * BASE62.length));
  }
  return out;
}

export async function generateUniqueCode(prisma, length = 6) {
  for (let i = 0; i < 20; i += 1) {
    const code = randomBase62(length);
    const exists = await prisma.url.findUnique({ where: { shortCode: code }, select: { id: true } });
    if (!exists) return code;
  }

  throw new Error('Unable to generate unique short code');
}

export function sanitizeAlias(alias) {
  return String(alias || '').replace(/[^a-zA-Z0-9]/g, '');
}

export function buildAliasSuggestions(input) {
  const cleaned = sanitizeAlias(input);
  const base = (cleaned || randomBase62(4)).slice(0, 6);
  const minBaseLength = Math.min(Math.max(base.length, 2), 6);
  const finalBase = base.slice(0, minBaseLength);

  const suggestions = new Set();
  while (suggestions.size < 4) {
    let candidate = `${finalBase}${randomBase62(2)}`;
    if (candidate.length < 4) {
      candidate += randomBase62(4 - candidate.length);
    }
    if (candidate.length > 8) {
      candidate = candidate.slice(0, 8);
    }
    suggestions.add(candidate);
  }
  return [...suggestions];
}

export function isValidAlias(alias) {
  return /^[a-zA-Z0-9]+$/.test(alias);
}
