const SITE_CONFIG_KEY = 'site:config';
const SITE_CONFIG_TABLE = 'site_config';
const SITE_CONFIG_ROW_KEY = 'global';

export const DEFAULT_SITE_CONFIG = {
  site_name: 'linkvio',
  primary: '#d946ef',
  secondary: '#3b82f6',
  developer_name: 'Giridharan',
  portfolio_url: '',
  copyright_year: new Date().getFullYear(),
  maintenance_mode: false,
  maintenance_message: 'We are performing scheduled maintenance. Please check back shortly.',
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

function normalizeDeveloper(value) {
  const v = String(value || '').trim();
  if (!v) return DEFAULT_SITE_CONFIG.developer_name;
  return v.slice(0, 60);
}

function normalizeUrl(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  try {
    const parsed = new URL(v);
    return parsed.toString();
  } catch {
    return '';
  }
}

function normalizeYear(value) {
  const year = Number(value);
  const current = new Date().getFullYear();
  if (!Number.isInteger(year)) return current;
  if (year < 2000) return 2000;
  if (year > current + 20) return current + 20;
  return year;
}

function normalizeMessage(value) {
  const v = String(value || '').trim();
  if (!v) return DEFAULT_SITE_CONFIG.maintenance_message;
  return v.slice(0, 220);
}

async function ensureSiteConfigTable(prisma) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${SITE_CONFIG_TABLE} (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function readSiteConfigFromDb(prisma) {
  await ensureSiteConfigTable(prisma);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT value FROM ${SITE_CONFIG_TABLE} WHERE key = $1 LIMIT 1`,
    SITE_CONFIG_ROW_KEY,
  );
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[0]?.value || null;
}

async function writeSiteConfigToDb(prisma, config) {
  await ensureSiteConfigTable(prisma);
  await prisma.$executeRawUnsafe(
    `INSERT INTO ${SITE_CONFIG_TABLE} (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    SITE_CONFIG_ROW_KEY,
    JSON.stringify(config),
  );
}

export function sanitizeSiteConfig(input = {}) {
  return {
    site_name: normalizeName(input.site_name),
    primary: normalizeHex(input.primary, DEFAULT_SITE_CONFIG.primary),
    secondary: normalizeHex(input.secondary, DEFAULT_SITE_CONFIG.secondary),
    developer_name: normalizeDeveloper(input.developer_name),
    portfolio_url: normalizeUrl(input.portfolio_url),
    copyright_year: normalizeYear(input.copyright_year),
    maintenance_mode: Boolean(input.maintenance_mode),
    maintenance_message: normalizeMessage(input.maintenance_message),
  };
}

export async function getSiteConfig(redis, prisma) {
  if (prisma) {
    try {
      const dbValue = await readSiteConfigFromDb(prisma);
      if (dbValue) {
        const safeFromDb = sanitizeSiteConfig(dbValue);
        try {
          await redis.set(SITE_CONFIG_KEY, JSON.stringify(safeFromDb));
        } catch {
          // cache write is best effort
        }
        return safeFromDb;
      }
    } catch {
      // fallback to redis/default
    }
  }

  try {
    const raw = await redis.get(SITE_CONFIG_KEY);
    if (!raw) return DEFAULT_SITE_CONFIG;
    return sanitizeSiteConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

export async function setSiteConfig(redis, config, prisma) {
  const safe = sanitizeSiteConfig(config);
  if (prisma) {
    try {
      await writeSiteConfigToDb(prisma, safe);
    } catch {
      // best effort, still update cache
    }
  }
  try {
    await redis.set(SITE_CONFIG_KEY, JSON.stringify(safe));
  } catch {
    // best-effort
  }
  return safe;
}
