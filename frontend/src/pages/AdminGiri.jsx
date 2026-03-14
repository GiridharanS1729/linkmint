import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';
import { useSiteConfig } from '../hooks/useSiteConfig';

export default function AdminGiri() {
  const { setSiteConfig } = useSiteConfig();
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are performing scheduled maintenance. Please check back shortly.');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!unlocked) return;
    api('/api/admin/giri')
      .then((data) => {
        setMaintenanceMode(Boolean(data.maintenance_mode));
        setMaintenanceMessage(data.maintenance_message || 'We are performing scheduled maintenance. Please check back shortly.');
      })
      .catch((error) => setMessage(error.message || 'Failed to load maintenance settings'));
  }, [unlocked]);

  async function unlock() {
    setMessage('');
    try {
      await api('/api/admin/giri/unlock', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setUnlocked(true);
      setPassword('');
    } catch (error) {
      setMessage(error.message || 'Invalid password');
    }
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const data = await api('/api/admin/giri', {
        method: 'PUT',
        body: JSON.stringify({
          maintenance_mode: maintenanceMode,
          maintenance_message: maintenanceMessage,
        }),
      });
      if (data?.config) {
        setSiteConfig((prev) => ({ ...prev, ...data.config }));
      }
      setMessage('Maintenance settings updated');
    } catch (error) {
      setMessage(error.message || 'Failed to update maintenance settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout title="Admin Maintenance">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200">
        <h2 className="text-lg font-semibold text-white">/admin/giri</h2>
        {!unlocked ? (
          <>
            <p className="mt-2 text-sm text-slate-300">Enter admin route password to open this page.</p>
            <div className="mt-4 max-w-md">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/20 bg-slate-900/40 px-3 text-white"
                placeholder="Enter password"
              />
              <button
                onClick={unlock}
                className="mt-3 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100"
              >
                Unlock
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-300">Switch the site between working mode and maintenance mode.</p>

            <label className="mt-5 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-transparent"
              />
              <span>Enable maintenance mode</span>
            </label>

            <label className="mt-4 block text-sm">
              <span className="mb-2 block text-slate-300">Maintenance Message</span>
              <textarea
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="h-28 w-full rounded-xl border border-white/20 bg-slate-900/40 p-3 text-white"
              />
            </label>

            <button
              disabled={saving}
              onClick={save}
              className="mt-4 rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </>
        )}
        {message && <p className="mt-3 text-sm text-slate-200">{message}</p>}
      </div>
    </DashboardLayout>
  );
}
