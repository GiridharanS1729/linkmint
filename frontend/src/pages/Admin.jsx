import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';
import { formatDate } from '../lib/utils';

const defaultAll = { users: [], urls: [] };
const defaultSystem = {
  health: { dependencies: {}, apis: [] },
  metrics: { users_total: 0, urls_total: 0, clicks_total: 0, logged_in_users_estimate: 0, not_logged_in_users_estimate: 0, role_distribution: [] },
};
const defaultRbac = { routes: [], global: {}, guest: {}, user: null };
const defaultRateLimits = { defaults: { user_per_minute: 10, guest_per_minute: 10 }, guest_per_minute: 10, user_limits: {} };
const defaultCors = { allowed_origins: [] };

export default function Admin() {
  const [data, setData] = useState(defaultAll);
  const [system, setSystem] = useState(defaultSystem);
  const [rbac, setRbac] = useState(defaultRbac);
  const [rateLimits, setRateLimits] = useState(defaultRateLimits);
  const [corsData, setCorsData] = useState(defaultCors);
  const [userFilter, setUserFilter] = useState('');
  const [urlFilter, setUrlFilter] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('POST:/api/url');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [selectedRateUserId, setSelectedRateUserId] = useState('');
  const [guestLimitValue, setGuestLimitValue] = useState('10');
  const [userLimitValue, setUserLimitValue] = useState('10');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  async function loadAll() {
    const [allData, systemData, rbacData, rateLimitData, corsResult] = await Promise.allSettled([
      api('/api/all'),
      api('/api/admin/system'),
      api('/api/admin/rbac'),
      api('/api/admin/rate-limits'),
      api('/api/admin/cors'),
    ]);

    const errors = [];

    if (allData.status === 'fulfilled') {
      setData(allData.value || defaultAll);
    } else {
      setData(defaultAll);
      errors.push(`all: ${allData.reason?.message || 'failed'}`);
    }

    if (systemData.status === 'fulfilled') {
      setSystem(systemData.value || defaultSystem);
    } else {
      setSystem(defaultSystem);
      errors.push(`system: ${systemData.reason?.message || 'failed'}`);
    }

    if (rbacData.status === 'fulfilled') {
      setRbac(rbacData.value || defaultRbac);
    } else {
      setRbac(defaultRbac);
      errors.push(`rbac: ${rbacData.reason?.message || 'failed'}`);
    }

    if (rateLimitData.status === 'fulfilled') {
      setRateLimits(rateLimitData.value || defaultRateLimits);
      setGuestLimitValue(String(rateLimitData.value?.guest_per_minute ?? 10));
    } else {
      setRateLimits(defaultRateLimits);
      errors.push(`rate-limits: ${rateLimitData.reason?.message || 'failed'}`);
    }

    if (corsResult.status === 'fulfilled') {
      setCorsData(corsResult.value || defaultCors);
    } else {
      setCorsData(defaultCors);
      errors.push(`cors: ${corsResult.reason?.message || 'failed'}`);
    }

    setLoadError(errors.length ? `Some admin APIs failed: ${errors.join(' | ')}` : '');
  }

  useEffect(() => {
    loadAll().catch((error) => {
      setData(defaultAll);
      setSystem(defaultSystem);
      setRbac(defaultRbac);
      setRateLimits(defaultRateLimits);
      setCorsData(defaultCors);
      setLoadError(error.message || 'Failed to load admin data');
    });
  }, []);

  const users = useMemo(() => data.users.filter((u) => `${u.email} ${u.role}`.toLowerCase().includes(userFilter.toLowerCase())), [data.users, userFilter]);
  const urls = useMemo(() => data.urls.filter((u) => `${u.shortCode} ${u.longUrl} ${u.user?.email || ''}`.toLowerCase().includes(urlFilter.toLowerCase())), [data.urls, urlFilter]);
  const globalClicks = urls.reduce((sum, item) => sum + (item._count?.clicks || 0), 0);

  async function setGlobalPolicy(allowed) {
    setLoading(true);
    setMessage('');
    try {
      await api('/api/admin/rbac/global', {
        method: 'PUT',
        body: JSON.stringify({ route_key: selectedRoute, allowed }),
      });
      setMessage(`Global policy updated: ${selectedRoute} => ${allowed ? 'allow' : 'deny'}`);
      const rbacData = await api('/api/admin/rbac');
      setRbac(rbacData);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function setGuestPolicy(allowed) {
    setLoading(true);
    setMessage('');
    try {
      await api('/api/admin/rbac/guest', {
        method: 'PUT',
        body: JSON.stringify({ route_key: selectedRoute, allowed }),
      });
      setMessage(`Guest policy updated: ${selectedRoute} => ${allowed ? 'allow' : 'deny'}`);
      const rbacData = await api('/api/admin/rbac');
      setRbac(rbacData);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function setUserPolicy(allowed) {
    if (!selectedUserId) {
      setMessage('Enter a user ID first');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await api(`/api/admin/rbac/user/${selectedUserId}`, {
        method: 'PUT',
        body: JSON.stringify({ route_key: selectedRoute, allowed }),
      });
      const rbacData = await api(`/api/admin/rbac?user_id=${selectedUserId}`);
      setRbac(rbacData);
      setMessage(`User ${selectedUserId} policy updated: ${selectedRoute} => ${allowed ? 'allow' : 'deny'}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateGuestRateLimit() {
    const maxPerMinute = Number(guestLimitValue);
    if (!Number.isFinite(maxPerMinute) || maxPerMinute < 0) {
      setMessage('Guest limit must be a number >= 0');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await api('/api/admin/rate-limits/guest', {
        method: 'PUT',
        body: JSON.stringify({ max_per_minute: Math.floor(maxPerMinute) }),
      });
      const next = await api('/api/admin/rate-limits');
      setRateLimits(next);
      setMessage(`Guest rate limit updated to ${Math.floor(maxPerMinute)} req/min`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateUserRateLimit() {
    const userId = Number(selectedRateUserId);
    const maxPerMinute = Number(userLimitValue);

    if (!Number.isInteger(userId) || userId <= 0) {
      setMessage('Enter a valid user ID for rate limit');
      return;
    }
    if (!Number.isFinite(maxPerMinute) || maxPerMinute < 0) {
      setMessage('User limit must be a number >= 0');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await api(`/api/admin/rate-limits/user/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ max_per_minute: Math.floor(maxPerMinute) }),
      });
      const next = await api('/api/admin/rate-limits');
      setRateLimits(next);
      setMessage(`User ${userId} rate limit updated to ${Math.floor(maxPerMinute)} req/min`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addOrigin() {
    if (!newOrigin.trim()) {
      setMessage('Enter an origin URL');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await api('/api/admin/cors', { method: 'POST', body: JSON.stringify({ origin: newOrigin.trim() }) });
      setCorsData(await api('/api/admin/cors'));
      setNewOrigin('');
      setMessage('Origin added');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function removeOrigin(origin) {
    setLoading(true);
    setMessage('');
    try {
      await api('/api/admin/cors', { method: 'DELETE', body: JSON.stringify({ origin }) });
      setCorsData(await api('/api/admin/cors'));
      setMessage('Origin removed');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Admin Console">
      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Total Users</p><p className="text-2xl font-semibold text-white">{system.metrics.users_total}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Total URLs</p><p className="text-2xl font-semibold text-white">{system.metrics.urls_total}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Global Clicks</p><p className="text-2xl font-semibold text-white">{system.metrics.clicks_total || globalClicks}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Logged In</p><p className="text-2xl font-semibold text-white">{system.metrics.logged_in_users_estimate}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Not Logged In</p><p className="text-2xl font-semibold text-white">{system.metrics.not_logged_in_users_estimate}</p></div>
      </div>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">System Health</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-200">
            <p className="text-slate-400">Overall</p>
            <p className="mt-1 text-base font-semibold text-white">{system.health.status || 'unknown'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-200">
            <p className="text-slate-400">PostgreSQL</p>
            <p className="mt-1 text-base font-semibold text-white">{system.health.dependencies?.postgres || 'unknown'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-200">
            <p className="text-slate-400">Redis</p>
            <p className="mt-1 text-base font-semibold text-white">{system.health.dependencies?.redis || 'unknown'}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">CORS Allowed Origins</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_170px]">
          <input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="https://new-domain.com" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
          <button disabled={loading} onClick={addOrigin} className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100">Add Origin</button>
        </div>
        <div className="mt-3 space-y-2">
          {(corsData.allowed_origins || []).map((origin) => (
            <div key={origin} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-200">
              <span className="truncate">{origin}</span>
              <button disabled={loading} onClick={() => removeOrigin(origin)} className="rounded-lg border border-rose-300/40 bg-rose-500/20 px-2 py-1 text-xs text-rose-100">Remove</button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">RBAC Route Control</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_160px]">
          <select value={selectedRoute} onChange={(e) => setSelectedRoute(e.target.value)} className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white">
            {rbac.routes.map((route) => (
              <option key={route.key} value={route.key}>{route.key} - {route.label}</option>
            ))}
          </select>
          <input value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} placeholder="User ID" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={loading} onClick={() => setGlobalPolicy(true)} className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100">Allow Global</button>
          <button disabled={loading} onClick={() => setGlobalPolicy(false)} className="rounded-xl border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">Deny Global</button>
          <button disabled={loading} onClick={() => setGuestPolicy(true)} className="rounded-xl border border-indigo-300/40 bg-indigo-500/20 px-3 py-2 text-sm text-indigo-100">Allow Guest</button>
          <button disabled={loading} onClick={() => setGuestPolicy(false)} className="rounded-xl border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-sm text-amber-100">Deny Guest</button>
          <button disabled={loading} onClick={() => setUserPolicy(true)} className="rounded-xl border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100">Allow User</button>
          <button disabled={loading} onClick={() => setUserPolicy(false)} className="rounded-xl border border-fuchsia-300/40 bg-fuchsia-500/20 px-3 py-2 text-sm text-fuchsia-100">Deny User</button>
        </div>
        {message && <p className="mt-3 text-sm text-slate-200">{message}</p>}
        {loadError && <p className="mt-2 text-sm text-amber-200">{loadError}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">URL Rate Limit Control</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <p className="text-xs text-slate-400">Default user limit</p>
            <p className="mt-1 text-lg font-semibold text-white">{rateLimits.defaults?.user_per_minute ?? 10} req/min</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <p className="text-xs text-slate-400">Current guest limit</p>
            <p className="mt-1 text-lg font-semibold text-white">{rateLimits.guest_per_minute ?? 10} req/min</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <p className="text-xs text-slate-400">Admin API key limit</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">Unlimited</p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
          <input value={guestLimitValue} onChange={(e) => setGuestLimitValue(e.target.value)} placeholder="Guest req/min" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
          <button disabled={loading} onClick={updateGuestRateLimit} className="rounded-xl border border-indigo-300/40 bg-indigo-500/20 px-3 py-2 text-sm text-indigo-100">Update Guest Limit</button>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_180px]">
          <input value={selectedRateUserId} onChange={(e) => setSelectedRateUserId(e.target.value)} placeholder="User ID" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
          <input value={userLimitValue} onChange={(e) => setUserLimitValue(e.target.value)} placeholder="User req/min" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
          <button disabled={loading} onClick={updateUserRateLimit} className="rounded-xl border border-cyan-300/40 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100">Update User Limit</button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">All Users</h2>
          <input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Filter users" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead><tr className="text-left text-slate-400"><th className="pb-2">ID</th><th className="pb-2">Email</th><th className="pb-2">Role</th><th className="pb-2">Created</th></tr></thead>
            <tbody>
              {users.map((u) => <tr key={u.id} className="border-t border-white/10"><td className="py-2">{u.id}</td><td className="py-2">{u.email}</td><td className="py-2">{u.role}</td><td className="py-2">{formatDate(u.createdAt)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">All URLs</h2>
          <input value={urlFilter} onChange={(e) => setUrlFilter(e.target.value)} placeholder="Filter URLs" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead><tr className="text-left text-slate-400"><th className="pb-2">Short</th><th className="pb-2">Long URL</th><th className="pb-2">Owner</th><th className="pb-2">Clicks</th></tr></thead>
            <tbody>
              {urls.map((u) => <tr key={u.id} className="border-t border-white/10"><td className="py-2">{u.shortCode}</td><td className="py-2">{u.longUrl}</td><td className="py-2">{u.user?.email || 'guest'}</td><td className="py-2">{u._count?.clicks || 0}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
