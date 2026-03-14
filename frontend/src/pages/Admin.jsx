import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';
import { formatDate } from '../lib/utils';

export default function Admin() {
  const [data, setData] = useState({ users: [], urls: [] });
  const [userFilter, setUserFilter] = useState('');
  const [urlFilter, setUrlFilter] = useState('');

  useEffect(() => {
    api('/api/all').then(setData).catch(() => setData({ users: [], urls: [] }));
  }, []);

  const users = useMemo(() => data.users.filter((u) => `${u.email} ${u.role}`.toLowerCase().includes(userFilter.toLowerCase())), [data.users, userFilter]);
  const urls = useMemo(() => data.urls.filter((u) => `${u.shortCode} ${u.longUrl} ${u.user?.email || ''}`.toLowerCase().includes(urlFilter.toLowerCase())), [data.urls, urlFilter]);

  const globalClicks = urls.reduce((sum, item) => sum + (item._count?.clicks || 0), 0);

  return (
    <DashboardLayout title="Admin Console">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Total Users</p><p className="text-2xl font-semibold text-white">{users.length}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Total URLs</p><p className="text-2xl font-semibold text-white">{urls.length}</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">Global Clicks</p><p className="text-2xl font-semibold text-white">{globalClicks}</p></div>
      </div>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">All Users</h2>
          <input value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Filter users" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead><tr className="text-left text-slate-400"><th className="pb-2">Email</th><th className="pb-2">Role</th><th className="pb-2">Created</th></tr></thead>
            <tbody>
              {users.map((u) => <tr key={u.id} className="border-t border-white/10"><td className="py-2">{u.email}</td><td className="py-2">{u.role}</td><td className="py-2">{formatDate(u.createdAt)}</td></tr>)}
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
