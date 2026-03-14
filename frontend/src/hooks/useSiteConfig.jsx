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
    };

    refreshSiteConfig();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ui-primary-rgb', hexToRgb(siteConfig.primary, '#d946ef'));
    root.style.setProperty('--ui-secondary-rgb', hexToRgb(siteConfig.secondary, '#3b82f6'));
  }, [siteConfig.primary, siteConfig.secondary]);

  const value = useMemo(() => ({ siteConfig, setSiteConfig }), [siteConfig]);
  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used inside SiteConfigProvider');
  return ctx;
}
