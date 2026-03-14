import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';
import { formatDate } from '../lib/utils';

const defaultAll = { users: [], urls: [] };
const defaultSystem = {
  health: { dependencies: {}, apis: [] },
  metrics: { users_total: 0, urls_total: 0, clicks_total: 0, logged_in_users_estimate: 0, not_logged_in_users_estimate: 0, role_distribution: [] },
};
const defaultDocs = { endpoints: [] };
const defaultRbac = { routes: [], global: {}, guest: {}, user: null };

export default function Admin() {
  const [data, setData] = useState(defaultAll);
  const [system, setSystem] = useState(defaultSystem);
  const [docs, setDocs] = useState(defaultDocs);
  const [rbac, setRbac] = useState(defaultRbac);
  const [userFilter, setUserFilter] = useState('');
  const [urlFilter, setUrlFilter] = useState('');
  const [docFilter, setDocFilter] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('POST:/api/url');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');

  async function loadAll() {
    const [allData, systemData, docsData, rbacData] = await Promise.allSettled([
      api('/api/all'),
      api('/api/admin/system'),
      api('/api/admin/docs'),
      api('/api/admin/rbac'),
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

    if (docsData.status === 'fulfilled') {
      setDocs(docsData.value || defaultDocs);
    } else {
      setDocs(defaultDocs);
      errors.push(`docs: ${docsData.reason?.message || 'failed'}`);
    }

    if (rbacData.status === 'fulfilled') {
      setRbac(rbacData.value || defaultRbac);
    } else {
      setRbac(defaultRbac);
      errors.push(`rbac: ${rbacData.reason?.message || 'failed'}`);
    }

    setLoadError(errors.length ? `Some admin APIs failed: ${errors.join(' | ')}` : '');
  }

  useEffect(() => {
    loadAll().catch((error) => {
      setData(defaultAll);
      setSystem(defaultSystem);
      setDocs(defaultDocs);
      setRbac(defaultRbac);
      setLoadError(error.message || 'Failed to load admin data');
    });
  }, []);

  const users = useMemo(() => data.users.filter((u) => `${u.email} ${u.role}`.toLowerCase().includes(userFilter.toLowerCase())), [data.users, userFilter]);
  const urls = useMemo(() => data.urls.filter((u) => `${u.shortCode} ${u.longUrl} ${u.user?.email || ''}`.toLowerCase().includes(urlFilter.toLowerCase())), [data.urls, urlFilter]);
  const endpoints = useMemo(() => docs.endpoints.filter((e) => `${e.method} ${e.path} ${e.auth} ${e.description}`.toLowerCase().includes(docFilter.toLowerCase())), [docs.endpoints, docFilter]);
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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">API Catalog (Swagger Style)</h2>
          <input value={docFilter} onChange={(e) => setDocFilter(e.target.value)} placeholder="Filter API docs" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead><tr className="text-left text-slate-400"><th className="pb-2">Method</th><th className="pb-2">Path</th><th className="pb-2">Auth</th><th className="pb-2">Description</th></tr></thead>
            <tbody>
              {endpoints.map((e) => <tr key={`${e.method}-${e.path}`} className="border-t border-white/10"><td className="py-2">{e.method}</td><td className="py-2 font-mono">{e.path}</td><td className="py-2">{e.auth}</td><td className="py-2">{e.description}</td></tr>)}
            </tbody>
          </table>
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
