import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';
import { useAuth } from '../hooks/useAuth';

function hexToRgbString(hex) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(String(hex || '')) ? String(hex) : '#d946ef';
  return `${parseInt(safe.slice(1, 3), 16)}, ${parseInt(safe.slice(3, 5), 16)}, ${parseInt(safe.slice(5, 7), 16)}`;
}

function applyTheme(theme) {
  document.documentElement.style.setProperty('--ui-primary-rgb', hexToRgbString(theme.primary));
  document.documentElement.style.setProperty('--ui-secondary-rgb', hexToRgbString(theme.secondary));
}

export default function Settings() {
  const { auth } = useAuth();
  const [theme, setTheme] = useState({ primary: '#d946ef', secondary: '#3b82f6' });
  const [message, setMessage] = useState('');
  const isAdmin = auth?.role === 'GAdmin';

  useEffect(() => {
    const endpoint = isAdmin ? '/api/admin/theme' : '/api/public/theme';
    api(endpoint)
      .then((data) => {
        const next = { primary: data.primary || '#d946ef', secondary: data.secondary || '#3b82f6' };
        setTheme(next);
        applyTheme(next);
      })
      .catch(() => {});
  }, [isAdmin]);

  async function saveTheme() {
    setMessage('');
    try {
      const data = await api('/api/admin/theme', { method: 'PUT', body: JSON.stringify(theme) });
      applyTheme(data.theme || theme);
      setMessage('Global theme updated.');
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div id="settings" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
        <h2 className="text-lg font-semibold text-white">UI Theme</h2>
        <p className="mt-2 text-sm text-slate-300">
          {isAdmin ? 'Change global UI colors for all users and domains.' : 'Only admins can change global UI colors.'}
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm">
            <span className="mb-2 block text-slate-300">Primary Color</span>
            <input type="color" value={theme.primary} disabled={!isAdmin} onChange={(e) => setTheme((prev) => ({ ...prev, primary: e.target.value }))} className="h-10 w-full rounded-md border border-white/20 bg-transparent" />
          </label>
          <label className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm">
            <span className="mb-2 block text-slate-300">Secondary Color</span>
            <input type="color" value={theme.secondary} disabled={!isAdmin} onChange={(e) => setTheme((prev) => ({ ...prev, secondary: e.target.value }))} className="h-10 w-full rounded-md border border-white/20 bg-transparent" />
          </label>
        </div>

        {isAdmin && (
          <button onClick={saveTheme} className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100">
            Save Global Theme
          </button>
        )}
        {message && <p className="mt-3 text-sm text-slate-200">{message}</p>}
      </div>
    </DashboardLayout>
  );
}

