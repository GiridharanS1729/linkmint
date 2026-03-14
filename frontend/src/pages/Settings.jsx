import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';
import { useSiteConfig } from '../hooks/useSiteConfig';

function hexToRgbString(hex, fallback) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(String(hex || '')) ? String(hex) : fallback;
  return `${parseInt(safe.slice(1, 3), 16)}, ${parseInt(safe.slice(3, 5), 16)}, ${parseInt(safe.slice(5, 7), 16)}`;
}

function applyTheme(theme) {
  document.documentElement.style.setProperty('--ui-primary-rgb', hexToRgbString(theme.primary, '#d946ef'));
  document.documentElement.style.setProperty('--ui-secondary-rgb', hexToRgbString(theme.secondary, '#3b82f6'));
}

export default function Settings() {
  const { auth } = useAuth();
  const { siteConfig, setSiteConfig } = useSiteConfig();
  const [form, setForm] = useState({ site_name: 'linkvio', primary: '#d946ef', secondary: '#3b82f6' });
  const [message, setMessage] = useState('');
  const isAdmin = auth?.role === 'GAdmin';

  useEffect(() => {
    const endpoint = isAdmin ? '/api/admin/site-config' : '/api/public/site-config';
    api(endpoint)
      .then((data) => {
        const next = {
          site_name: data.site_name || 'linkvio',
          primary: data.primary || '#d946ef',
          secondary: data.secondary || '#3b82f6',
        };
        setForm(next);
        setSiteConfig((prev) => ({ ...prev, ...next }));
        applyTheme(next);
      })
      .catch(() => {});
  }, [isAdmin, setSiteConfig]);

  async function saveSiteConfig() {
    setMessage('');
    try {
      const payload = { site_name: form.site_name, primary: form.primary, secondary: form.secondary };
      const data = await api('/api/admin/site-config', { method: 'PUT', body: JSON.stringify(payload) });
      const next = data.config || payload;
      setSiteConfig((prev) => ({ ...prev, ...next }));
      applyTheme(next);
      setMessage('Global site settings updated.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div id="settings" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
        <h2 className="text-lg font-semibold text-white">Global Site Settings</h2>
        <p className="mt-2 text-sm text-slate-300">
          {isAdmin ? 'Change site name and theme colors globally for all users.' : 'Only admins can change global site settings.'}
        </p>

        <div className="mt-4 grid gap-3">
          <label className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm">
            <span className="mb-2 block text-slate-300">Site Name</span>
            <input type="text" value={form.site_name} disabled={!isAdmin} onChange={(e) => setForm((prev) => ({ ...prev, site_name: e.target.value }))} className="h-10 w-full rounded-md border border-white/20 bg-transparent px-3 text-white" />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm">
            <span className="mb-2 block text-slate-300">Primary Color</span>
            <input type="color" value={form.primary} disabled={!isAdmin} onChange={(e) => setForm((prev) => ({ ...prev, primary: e.target.value }))} className="h-10 w-full rounded-md border border-white/20 bg-transparent" />
          </label>
          <label className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm">
            <span className="mb-2 block text-slate-300">Secondary Color</span>
            <input type="color" value={form.secondary} disabled={!isAdmin} onChange={(e) => setForm((prev) => ({ ...prev, secondary: e.target.value }))} className="h-10 w-full rounded-md border border-white/20 bg-transparent" />
          </label>
        </div>

        {isAdmin && (
          <button onClick={saveSiteConfig} className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100">
            Save Global Settings
          </button>
        )}
        {message && <p className="mt-3 text-sm text-slate-200">{message}</p>}
        {!isAdmin && <p className="mt-3 text-xs text-slate-400">Current site: {siteConfig.site_name}</p>}
      </div>
    </DashboardLayout>
  );
}

