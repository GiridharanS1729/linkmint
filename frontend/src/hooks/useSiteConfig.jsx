import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../api';

const SiteConfigContext = createContext(null);

function hexToRgb(hex, fallback) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(String(hex || '')) ? String(hex) : fallback;
  return `${parseInt(safe.slice(1, 3), 16)}, ${parseInt(safe.slice(3, 5), 16)}, ${parseInt(safe.slice(5, 7), 16)}`;
}

export function SiteConfigProvider({ children }) {
  const [siteConfig, setSiteConfig] = useState({
    site_name: 'linkvio',
    primary: '#d946ef',
    secondary: '#3b82f6',
    total_views: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/public/site-config`).then((r) => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/public/stats`).then((r) => r.json()).catch(() => ({})),
    ]).then(([cfg, stats]) => {
      const next = {
        site_name: cfg.site_name || 'linkvio',
        primary: cfg.primary || '#d946ef',
        secondary: cfg.secondary || '#3b82f6',
        total_views: Number(stats.total_views || 0),
      };
      setSiteConfig(next);

      const root = document.documentElement;
      root.style.setProperty('--ui-primary-rgb', hexToRgb(next.primary, '#d946ef'));
      root.style.setProperty('--ui-secondary-rgb', hexToRgb(next.secondary, '#3b82f6'));
    });
  }, []);

  const value = useMemo(() => ({ siteConfig, setSiteConfig }), [siteConfig]);
  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used inside SiteConfigProvider');
  return ctx;
}

