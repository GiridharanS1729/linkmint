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
    developer_name: 'Giridharan',
    portfolio_url: '',
    copyright_year: new Date().getFullYear(),
    maintenance_mode: false,
    maintenance_message: 'We are performing scheduled maintenance. Please check back shortly.',
    total_views: 0,
  });

  useEffect(() => {
    let mounted = true;

    const applyTheme = (cfg) => {
      const root = document.documentElement;
      root.style.setProperty('--ui-primary-rgb', hexToRgb(cfg.primary, '#d946ef'));
      root.style.setProperty('--ui-secondary-rgb', hexToRgb(cfg.secondary, '#3b82f6'));
    };

    const fetchWithTimeout = async (url, timeoutMs = 3000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return {};
        return await res.json();
      } catch {
        return {};
      } finally {
        clearTimeout(timer);
      }
    };

    const refreshSiteConfig = async () => {
      const [cfg, stats] = await Promise.all([
        fetchWithTimeout(`${API_URL}/api/public/site-config`),
        fetchWithTimeout(`${API_URL}/api/public/stats`),
      ]);
      if (!mounted) return;

      const next = {
        site_name: cfg.site_name || 'linkvio',
        primary: cfg.primary || '#d946ef',
        secondary: cfg.secondary || '#3b82f6',
        developer_name: cfg.developer_name || 'Giridharan',
        portfolio_url: cfg.portfolio_url || '',
        copyright_year: Number(cfg.copyright_year || new Date().getFullYear()),
        maintenance_mode: Boolean(cfg.maintenance_mode),
        maintenance_message: cfg.maintenance_message || 'We are performing scheduled maintenance. Please check back shortly.',
        total_views: Number(stats.total_views || 0),
      };

      setSiteConfig(next);
      applyTheme(next);
    };

    refreshSiteConfig();

    const interval = setInterval(refreshSiteConfig, 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshSiteConfig();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const value = useMemo(() => ({ siteConfig, setSiteConfig }), [siteConfig]);
  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used inside SiteConfigProvider');
  return ctx;
}
