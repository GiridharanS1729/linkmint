import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api';

export default function ApiDocsPage() {
  const [docs, setDocs] = useState({ role: 'user', endpoints: [] });
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/docs')
      .then(setDocs)
      .catch((err) => setError(err.message));
  }, []);

  const endpoints = useMemo(() => {
    return (docs.endpoints || []).filter((e) => `${e.method} ${e.path} ${e.auth} ${e.description}`.toLowerCase().includes(query.toLowerCase()));
  }, [docs.endpoints, query]);

  return (
    <DashboardLayout title="API Docs">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-300">Role: <span className="font-semibold text-white">{docs.role || 'user'}</span></p>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter APIs" className="h-10 rounded-xl border border-white/20 bg-slate-900/40 px-3 text-sm text-white" />
        </div>
        {error && <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-2 text-sm text-rose-200">{error}</p>}
        <div className="overflow-auto">
          <table className="min-w-full text-sm text-slate-200">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-2">Method</th>
                <th className="pb-2">Path</th>
                <th className="pb-2">Auth</th>
                <th className="pb-2">Description</th>
                <th className="pb-2">Sample</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((e) => (
                <tr key={`${e.method}-${e.path}`} className="border-t border-white/10 align-top">
                  <td className="py-2">{e.method}</td>
                  <td className="py-2 font-mono">{e.path}</td>
                  <td className="py-2">{e.auth}</td>
                  <td className="py-2">{e.description}</td>
                  <td className="py-2">
                    {docs.role === 'GAdmin' && e.sample ? (
                      <pre className="max-w-sm overflow-auto rounded-lg bg-slate-950/60 p-2 text-[11px] text-slate-300">
                        <code>{JSON.stringify(e.sample, null, 2)}</code>
                      </pre>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}

