const SITE_CONFIG_KEY = 'site:config';

export const DEFAULT_SITE_CONFIG = {
  site_name: 'linkvio',
  primary: '#d946ef',
  secondary: '#3b82f6',
};

function normalizeHex(value, fallback) {
  const v = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

function normalizeName(value) {
  const v = String(value || '').trim();
  if (!v) return DEFAULT_SITE_CONFIG.site_name;
  return v.slice(0, 40);
}

export function sanitizeSiteConfig(input = {}) {
  return {
    site_name: normalizeName(input.site_name),
    primary: normalizeHex(input.primary, DEFAULT_SITE_CONFIG.primary),
    secondary: normalizeHex(input.secondary, DEFAULT_SITE_CONFIG.secondary),
  };
}

export async function getSiteConfig(redis) {
  try {
    const raw = await redis.get(SITE_CONFIG_KEY);
    if (!raw) return DEFAULT_SITE_CONFIG;
    return sanitizeSiteConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

export async function setSiteConfig(redis, config) {
  const safe = sanitizeSiteConfig(config);
  try {
    await redis.set(SITE_CONFIG_KEY, JSON.stringify(safe));
  } catch {
    // best-effort
  }
  return safe;
}

