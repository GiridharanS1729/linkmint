const THEME_KEY = 'ui:theme';

const DEFAULT_THEME = {
  primary: '#d946ef',
  secondary: '#3b82f6',
};

function normalizeHex(value, fallback) {
  const v = String(value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  return fallback;
}

export function sanitizeTheme(input = {}) {
  return {
    primary: normalizeHex(input.primary, DEFAULT_THEME.primary),
    secondary: normalizeHex(input.secondary, DEFAULT_THEME.secondary),
  };
}

export async function getTheme(redis) {
  try {
    const raw = await redis.get(THEME_KEY);
    if (!raw) return DEFAULT_THEME;
    return sanitizeTheme(JSON.parse(raw));
  } catch {
    return DEFAULT_THEME;
  }
}

export async function setTheme(redis, theme) {
  const safe = sanitizeTheme(theme);
  try {
    await redis.set(THEME_KEY, JSON.stringify(safe));
  } catch {
    // best-effort; fallback remains default
  }
  return safe;
}

export { DEFAULT_THEME };

